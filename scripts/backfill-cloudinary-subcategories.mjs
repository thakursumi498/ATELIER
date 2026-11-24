#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const REPORT = path.join(ROOT, "reports/cloudinary-subcategory-backfill.json");

function parseEnvFile(source) {
  const result = {};
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/u);
    if (!match || match[1].startsWith("#")) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

async function loadEnvironment() {
  const environment = { ...process.env };
  for (const filename of [".env.local", ".env.production.local", ".env"]) {
    const source = await fs.readFile(path.join(ROOT, filename), "utf8").catch(() => "");
    for (const [key, value] of Object.entries(parseEnvFile(source))) environment[key] ||= value;
  }
  if ((!environment.CLOUDINARY_CLOUD_NAME || !environment.CLOUDINARY_API_KEY || !environment.CLOUDINARY_API_SECRET) && environment.CLOUDINARY_URL) {
    try {
      const cloudinaryUrl = new URL(environment.CLOUDINARY_URL);
      environment.CLOUDINARY_API_KEY ||= decodeURIComponent(cloudinaryUrl.username);
      environment.CLOUDINARY_API_SECRET ||= decodeURIComponent(cloudinaryUrl.password);
      environment.CLOUDINARY_CLOUD_NAME ||= cloudinaryUrl.hostname;
    } catch { /* The validation below reports incomplete configuration without printing values. */ }
  }
  return environment;
}

const env = await loadEnvironment();
const cloud = env.CLOUDINARY_CLOUD_NAME;
const apiKey = env.CLOUDINARY_API_KEY;
const apiSecret = env.CLOUDINARY_API_SECRET;
if (!cloud || !apiKey || !apiSecret || /\*+/.test(apiSecret)) {
  console.error("Cloudinary credentials are unavailable. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET locally first.");
  process.exit(1);
}

const categorySource = await fs.readFile(path.join(ROOT, "src/lib/drive-category-assets.ts"), "utf8");
const marker = categorySource.indexOf("export const DRIVE_CATEGORY_ASSETS");
const equals = categorySource.indexOf("=", marker);
if (marker < 0 || equals < 0) throw new Error("The static design category manifest could not be read.");
const categoryJson = categorySource.slice(equals + 1).trim().replace(/;\s*$/u, "");
const categories = JSON.parse(categoryJson);
const subcategoryByArtwork = new Map();
for (const category of categories) {
  for (const image of category.images || []) {
    const name = String(image.subCategory || "").trim();
    if (!name) continue;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    subcategoryByArtwork.set(`${category.slug}:${String(image.code).toUpperCase()}`, { name, slug, categoryName: category.name, slotCode: category.slotCode });
  }
}

const auth = { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` };
const resources = [];
let cursor;
for (let page = 0; page < 10; page += 1) {
  const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload`);
  url.searchParams.set("prefix", "atelier-wall-story/");
  url.searchParams.set("max_results", "500");
  url.searchParams.set("context", "true");
  url.searchParams.set("tags", "true");
  if (cursor) url.searchParams.set("next_cursor", cursor);
  const response = await fetch(url, { headers: auth, signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.resources)) throw new Error("Cloudinary image inventory could not be read.");
  resources.push(...data.resources);
  cursor = data.next_cursor;
  if (!cursor) break;
}

const planned = resources.flatMap((asset) => {
  const custom = asset.context?.custom || {};
  const categorySlug = custom.category_slug || asset.public_id.match(/^atelier-wall-story\/designs\/(?:categories\/)?([^/]+)\//u)?.[1] || "";
  const artworkCode = String(custom.artwork_code || asset.public_id.match(/AE\d{2}-\d{2}/iu)?.[0] || "").toUpperCase();
  const subcategory = subcategoryByArtwork.get(`${categorySlug}:${artworkCode}`);
  if (!subcategory) return [];
  const context = {
    ...custom,
    placement: "design",
    page: "explore-designs",
    section: "catalogue",
    category_slug: categorySlug,
    category_name: subcategory.categoryName,
    category_code: subcategory.slotCode,
    artwork_code: artworkCode,
    subcategory_slug: subcategory.slug,
    subcategory_name: subcategory.name,
  };
  const tags = [...new Set([...(asset.tags || []), categorySlug, subcategory.slug])];
  return [{ publicId: asset.public_id, context, tags, categoryName: subcategory.categoryName, subcategoryName: subcategory.name }];
});

const results = [];
for (const entry of planned) {
  if (!APPLY) {
    results.push({ publicId: entry.publicId, category: entry.categoryName, subcategory: entry.subcategoryName, status: "planned" });
    continue;
  }
  const pathId = entry.publicId.split("/").map(encodeURIComponent).join("/");
  const context = Object.entries(entry.context).map(([key, value]) => `${key}=${String(value).replace(/[|=]/g, " ")}`).join("|");
  const form = new URLSearchParams({ context, tags: entry.tags.join(",") });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${pathId}`, { method: "POST", headers: auth, body: form, signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  const verifiedContext = result.context?.custom || {};
  const verified = response.ok && result.public_id === entry.publicId && verifiedContext.placement === "design" && verifiedContext.category_code === entry.context.category_code && verifiedContext.subcategory_slug === entry.context.subcategory_slug && verifiedContext.subcategory_name === entry.context.subcategory_name;
  results.push({ publicId: entry.publicId, category: entry.categoryName, subcategory: entry.subcategoryName, status: verified ? "verified" : "failed", httpStatus: response.status });
  if (!verified) throw new Error(`Cloudinary subcategory metadata could not be verified for ${entry.publicId}.`);
}

const report = {
  mode: APPLY ? "apply" : "dry-run",
  totalDesignArtworkRecords: subcategoryByArtwork.size,
  matchedCloudinaryAssets: planned.length,
  updatedAndVerified: results.filter((result) => result.status === "verified").length,
  missingCloudinaryAssets: [...subcategoryByArtwork.keys()].filter((key) => !planned.some((entry) => `${entry.context.category_slug}:${entry.context.artwork_code}` === key)),
  results,
  completedAt: new Date().toISOString(),
};
await fs.mkdir(path.dirname(REPORT), { recursive: true });
await fs.writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ mode: report.mode, totalDesignArtworkRecords: report.totalDesignArtworkRecords, matchedCloudinaryAssets: report.matchedCloudinaryAssets, updatedAndVerified: report.updatedAndVerified, missingCloudinaryAssets: report.missingCloudinaryAssets.length, report: path.relative(ROOT, REPORT) }, null, 2));
