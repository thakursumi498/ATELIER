#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const APPLY = process.argv.includes("--apply");
const LINK_ONLY = process.argv.includes("--link-only");
const CONCURRENCY = 3;
const MAX_WIDTH = 2400;
const QUALITY = 84;
const IMAGE_PATH_RE = /\/(?:images|samples)\/[A-Za-z0-9_./% -]+?\.(?:jpe?g|png|webp|avif|svg)/gi;
const MIGRATION_FOLDER = "atelier-wall-story";
const OUTPUT_MANIFEST = path.join(ROOT, "src/lib/cloudinary-image-manifest.generated.json");
const REPORT_PATH = path.join(ROOT, "reports/cloudinary-image-migration.json");

const walk = async dir => {
  const results = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await walk(full));
    else if (/\.(?:ts|tsx|js|jsx|mjs|css|json|html|md)$/i.test(entry.name)) results.push(full);
  }
  return results;
};
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const normalized = value => value.replaceAll("\\", "/").replace(/^\/+/, "/");
const categoryFrom = sourcePath => {
  const match = sourcePath.match(/\/drive-categories\/([^/]+)\/(AE\d{2}-\d{2})\./i);
  if (!match) return null;
  return { slug: match[1], code: match[2].toUpperCase() };
};
const placementFrom = sourcePath => {
  const category = categoryFrom(sourcePath);
  const clean = sourcePath.toLowerCase();
  if (category) return { page: "explore-designs", section: "catalogue", categorySlug: category.slug, categoryCode: category.code, order: Number(category.code.split("-")[1]) };
  const rules = [
    ["home", /\/home\/|home-|homepage/],
    ["projects", /\/projects?\/|project-|portfolio/],
    ["services", /\/services?\/|service-/],
    ["about", /\/about\/|about-/],
    ["process", /\/process\/|process-/],
    ["contact", /\/contact\/|contact-/],
    ["blogs", /\/blogs?\/|blog-|journal/],
    ["visualizer", /\/visualizer\/|visualizer-/],
  ];
  const page = rules.find(([, pattern]) => pattern.test(clean))?.[0] || "miscellaneous";
  const parts = sourcePath.split("/").filter(Boolean);
  const filename = parts.at(-1) || "miscellaneous";
  const parent = parts.at(-2) || "miscellaneous";
  return { page, section: parent === "atelier" ? filename.replace(/\.[^.]+$/, "") : parent, categorySlug: "", categoryCode: "", order: 0 };
};
const safeTag = value => String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const publicIdFor = sourcePath => {
  const parts = sourcePath.replace(/^\//, "").split("/");
  const filename = parts.pop().replace(/\.[^.]+$/, "");
  const categoryIndex = parts.indexOf("drive-categories");
  let folder;
  if (categoryIndex >= 0) folder = ["designs", "categories", ...parts.slice(categoryIndex + 1)];
  else {
    const placement = placementFrom(sourcePath);
    const relative = parts.join("/").replace(/^images\/atelier\/?/, "").split("/").filter(Boolean);
    const pageIndex = relative.findIndex(part => part === placement.page);
    folder = [placement.page, ...(pageIndex >= 0 ? relative.filter((_, index) => index !== pageIndex) : relative)];
  }
  return `${MIGRATION_FOLDER}/${folder.join("/")}/${filename}`;
};
function sign(params, secret) {
  const body = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  return crypto.createHash("sha1").update(body + secret).digest("hex");
}
function authHeaders(apiKey, secret) {
  return { Authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}` };
}
async function optimize(bytes) {
  const input = sharp(bytes, { limitInputPixels: 50_000_000, failOn: "error" });
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 50_000_000) throw new Error("Unsupported or oversized image dimensions.");
  const result = await input.rotate().resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: "inside", withoutEnlargement: true }).webp({ quality: QUALITY, effort: 5, smartSubsample: true }).toBuffer({ resolveWithObject: true });
  if (!result.info.width || !result.info.height || !result.data.length) throw new Error("Optimized output failed validation.");
  await sharp(result.data, { limitInputPixels: 50_000_000, failOn: "error" }).metadata();
  return { bytes: result.data, width: result.info.width, height: result.info.height, inputWidth: metadata.width, inputHeight: metadata.height };
}
async function fetchExisting(cloud, apiKey, secret, publicId) {
  const pathId = publicId.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${pathId}?context=true&tags=true`, { headers: authHeaders(apiKey, secret), signal: AbortSignal.timeout(20000) });
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(`Cloudinary asset check failed (${response.status}).`);
  return data;
}
async function upload(cloud, apiKey, secret, item) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const context = [
    `asset_key=${item.assetKey}`,
    `source_path=${item.sourcePath}`,
    `placement=${item.placement.categorySlug ? "design" : "section"}`,
    `page=${item.placement.page}`,
    `section=${item.placement.section}`,
    `category_slug=${item.placement.categorySlug}`,
    `category_code=${item.placement.categoryCode}`,
    `artwork_code=${item.placement.categoryCode}`,
    `display_order=${item.placement.order}`,
    "active=true",
    `alt=${item.sourcePath.split("/").at(-1).replace(/\.[^.]+$/, "").replace(/[|=]/g, " ").slice(0, 200)}`,
  ].join("|");
  const tags = ["atelier-site", item.placement.page, item.placement.section, item.placement.categorySlug, item.placement.categoryCode].map(safeTag).filter(Boolean).join(",");
  const params = { public_id: item.publicId, timestamp, overwrite: "false", unique_filename: "false", tags, context };
  const form = new FormData();
  form.append("file", new Blob([item.optimized.bytes], { type: "image/webp" }), "optimized.webp");
  for (const [key, value] of Object.entries({ ...params, api_key: apiKey, signature: sign(params, secret) })) form.append(key, value);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(60000) });
  const data = await response.json();
  if (!response.ok || typeof data.public_id !== "string" || data.public_id !== item.publicId) throw new Error(`Cloudinary upload failed (${response.status}).`);
  return { uploadedBytes: Number(data.bytes || item.optimized.bytes.length), width: Number(data.width || item.optimized.width), height: Number(data.height || item.optimized.height), format: String(data.format || "webp") };
}

const files = [...await walk(path.join(ROOT, "src")), ...await walk(PUBLIC)].filter(file => file !== OUTPUT_MANIFEST);
const refs = new Map();
for (const file of files) {
  const text = await fs.readFile(file, "utf8").catch(() => "");
  for (const match of text.matchAll(IMAGE_PATH_RE)) {
    if (/https?:\/\/[^"'\s]*$/i.test(text.slice(Math.max(0, match.index - 300), match.index))) continue;
    const sourcePath = normalized(match[0]);
    const items = refs.get(sourcePath) || [];
    items.push(path.relative(ROOT, file).split(path.sep).join("/"));
    refs.set(sourcePath, items);
  }
}
const activePaths = [...refs.keys()].filter(value => value.startsWith("/images/") || value.startsWith("/samples/")).sort();
if (!activePaths.length) {
  const existingManifest = await fs.readFile(OUTPUT_MANIFEST, "utf8").then(JSON.parse).catch(() => null);
  if (Array.isArray(existingManifest?.assets) && existingManifest.assets.length) {
    console.log(JSON.stringify({ mode: "already-migrated", assets: existingManifest.assets.length, manifest: path.relative(ROOT, OUTPUT_MANIFEST), note: "Source references already point to Cloudinary; no files or assets changed." }, null, 2));
    process.exit(0);
  }
  console.error("No active local image references or completed Cloudinary manifest were found.");
  process.exit(1);
}
if (LINK_ONLY) {
  const manifest = await fs.readFile(OUTPUT_MANIFEST, "utf8").then(JSON.parse).catch(() => null);
  if (!Array.isArray(manifest?.assets) || !manifest.assets.length) throw new Error("A completed Cloudinary manifest is required before linking source images.");
  const urlBySource = new Map();
  for (const asset of manifest.assets) {
    if (typeof asset.url !== "string" || !asset.url.startsWith("https://res.cloudinary.com/")) throw new Error("The Cloudinary manifest contains an unverified image URL.");
    for (const sourcePath of asset.sourcePaths || [asset.sourcePath]) urlBySource.set(sourcePath, asset.url);
  }
  const missingMappings = activePaths.filter(sourcePath => !urlBySource.has(sourcePath));
  if (missingMappings.length) throw new Error(`The manifest is missing ${missingMappings.length} active source image mappings: ${missingMappings.join(", ")}`);
  const sourceUpdates = [];
  let replacedReferences = 0;
  for (const file of files) {
    let contents = await fs.readFile(file, "utf8").catch(() => null);
    if (contents === null) continue;
    const originalContents = contents;
    const relativeFile = path.relative(ROOT, file).split(path.sep).join("/");
    for (const sourcePath of activePaths) {
      const occurrences = contents.split(sourcePath).length - 1;
      if (!occurrences) continue;
      const expected = refs.get(sourcePath)?.filter(referenceFile => referenceFile === relativeFile).length || 0;
      if (occurrences !== expected) throw new Error(`Reference count changed for ${sourcePath}; source files were not updated.`);
      contents = contents.split(sourcePath).join(urlBySource.get(sourcePath));
      replacedReferences += occurrences;
    }
    if (contents !== originalContents) sourceUpdates.push({ file, contents });
  }
  const expectedReferences = activePaths.reduce((total, sourcePath) => total + (refs.get(sourcePath)?.length || 0), 0);
  if (replacedReferences !== expectedReferences) throw new Error("Not all active image references were mapped; source files were not updated.");
  for (const update of sourceUpdates) await fs.writeFile(update.file, update.contents);
  const report = await fs.readFile(REPORT_PATH, "utf8").then(JSON.parse).catch(() => ({}));
  await fs.writeFile(REPORT_PATH, JSON.stringify({ ...report, uploadedReferences: replacedReferences, updatedSourceFiles: sourceUpdates.length, sourceReferencesReplaced: true, referencesLinkedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ mode: "link-only", manifestAssets: manifest.assets.length, replacedReferences, updatedSourceFiles: sourceUpdates.length }, null, 2));
  process.exit(0);
}
const missing = [];
const referenced = [];
for (const sourcePath of activePaths) {
  const filename = path.join(PUBLIC, sourcePath.replace(/^\//, ""));
  try { const bytes = await fs.readFile(filename); referenced.push({ sourcePath, filename, bytes, sourceBytes: bytes.length, sha256: sha256(bytes) }); }
  catch { missing.push(sourcePath); }
}
if (missing.length) {
  console.error(JSON.stringify({ error: "Some source image references are missing.", missing }, null, 2));
  process.exitCode = 1;
} else {
  const uniqueByHash = new Map();
  for (const item of referenced) {
    if (!uniqueByHash.has(item.sha256)) uniqueByHash.set(item.sha256, []);
    uniqueByHash.get(item.sha256).push(item);
  }
  const items = [];
  for (const group of uniqueByHash.values()) {
    group.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
    const canonical = group[0];
    const optimized = await optimize(canonical.bytes);
    const placement = placementFrom(canonical.sourcePath);
    const pathHash = sha256(Buffer.from(canonical.sourcePath)).slice(0, 12).toUpperCase();
    const referenceFiles = [...new Set(group.flatMap(item => refs.get(item.sourcePath) || []))].sort();
    items.push({
      assetKey: `ATW-${pathHash}`,
      sourcePath: canonical.sourcePath,
      sourcePaths: group.map(item => item.sourcePath),
      publicId: publicIdFor(canonical.sourcePath),
      url: null,
      sha256: canonical.sha256,
      sourceBytes: group.reduce((sum, item) => sum + item.sourceBytes, 0),
      canonicalSourceBytes: canonical.sourceBytes,
      optimizedBytes: optimized.bytes.length,
      width: optimized.width,
      height: optimized.height,
      sourceWidth: optimized.inputWidth,
      sourceHeight: optimized.inputHeight,
      format: "webp",
      placement,
      referenceFiles,
      optimized,
      cloudinary: null,
    });
  }
  const summary = {
    discoveredSourcePaths: activePaths.length,
    missingReferences: missing.length,
    uniqueSourceImages: items.length,
    duplicateSourcePaths: referenced.length - items.length,
    originalReferencedBytes: referenced.reduce((sum, item) => sum + item.sourceBytes, 0),
    originalUniqueBytes: items.reduce((sum, item) => sum + item.canonicalSourceBytes, 0),
    optimizedUniqueBytes: items.reduce((sum, item) => sum + item.optimizedBytes, 0),
    compressionSavedBytes: items.reduce((sum, item) => sum + item.canonicalSourceBytes - item.optimizedBytes, 0),
    compressionPercent: items.length ? Number(((1 - items.reduce((sum, item) => sum + item.optimizedBytes, 0) / items.reduce((sum, item) => sum + item.canonicalSourceBytes, 0)) * 100).toFixed(1)) : 0,
    categoryCounts: {},
    artworkCodeCounts: {},
    uploaded: 0,
    alreadyPresent: 0,
    failures: [],
  };
  for (const item of items) {
    if (item.placement.categoryCode) {
      summary.categoryCounts[item.placement.categorySlug] = (summary.categoryCounts[item.placement.categorySlug] || 0) + 1;
      summary.artworkCodeCounts[item.placement.categoryCode] = (summary.artworkCodeCounts[item.placement.categoryCode] || 0) + 1;
    }
  }
  const publicIds = new Set();
  const collisions = items.filter(item => publicIds.has(item.publicId) || !publicIds.add(item.publicId)).map(item => item.publicId);
  if (collisions.length) throw new Error(`Public ID collision detected: ${collisions.join(", ")}`);
  if (APPLY) {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !secret) throw new Error("Cloudinary server credentials are missing; no images were uploaded.");
    const use = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, { headers: authHeaders(apiKey, secret), signal: AbortSignal.timeout(20000) });
    const usage = await use.json();
    if (!use.ok) throw new Error(`Could not verify Cloudinary Free usage (${use.status}); refusing to upload.`);
    if (Number(usage.credits?.used_percent || 0) >= 90) throw new Error("Cloudinary usage is near the Free plan limit; refusing to upload.");
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const item = items[next++];
        let lastError;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const existing = await fetchExisting(cloud, apiKey, secret, item.publicId);
            if (existing) {
              if (existing.format !== "webp") throw new Error(`Existing public ID has unexpected format (${existing.format}).`);
              const existingContext = existing.context?.custom || {};
              if (existingContext.asset_key !== item.assetKey || existingContext.source_path !== item.sourcePath) throw new Error("Existing Cloudinary public ID belongs to a different source image; refusing to overwrite it.");
              item.cloudinary = { width: Number(existing.width), height: Number(existing.height), uploadedBytes: Number(existing.bytes), format: existing.format };
              summary.alreadyPresent++;
            } else {
              item.cloudinary = await upload(cloud, apiKey, secret, item);
              summary.uploaded++;
            }
            const url = `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${item.publicId}.webp`;
            const verification = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20000) });
            if (!verification.ok || !verification.headers.get("content-type")?.startsWith("image/")) throw new Error("Cloudinary CDN image verification failed.");
            item.url = url;
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt)));
          }
        }
        if (lastError) summary.failures.push({ sourcePath: item.sourcePath, error: lastError instanceof Error ? lastError.message : "Upload failed" });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    if (summary.failures.length) {
      await fs.writeFile(REPORT_PATH, JSON.stringify({ ...summary, cloudinaryPlan: "Free", completedAt: new Date().toISOString() }, null, 2));
      console.error(JSON.stringify({ error: "Migration incomplete; no source references were changed.", ...summary }, null, 2));
      process.exitCode = 1;
    } else {
      const replacementBySource = new Map();
      for (const item of items) for (const sourcePath of item.sourcePaths) replacementBySource.set(sourcePath, item.url);
      const sourceUpdates = [];
      let replacedReferences = 0;
      for (const file of files) {
        let contents = await fs.readFile(file, "utf8").catch(() => null);
        if (contents === null) continue;
        const originalContents = contents;
        for (const [sourcePath, url] of replacementBySource) {
          const occurrences = contents.split(sourcePath).length - 1;
          if (!occurrences) continue;
          const expected = refs.get(sourcePath)?.filter(referenceFile => referenceFile === path.relative(ROOT, file).split(path.sep).join("/")).length || 0;
          if (occurrences !== expected) throw new Error(`Reference count changed for ${sourcePath}; refusing to update source files.`);
          contents = contents.split(sourcePath).join(url);
          replacedReferences += occurrences;
        }
        if (contents !== originalContents) sourceUpdates.push({ file, contents });
      }
      const expectedReferences = activePaths.reduce((total, sourcePath) => total + (refs.get(sourcePath)?.length || 0), 0);
      if (replacedReferences !== expectedReferences) throw new Error("Not all active image references were mapped; source files were not updated.");
      for (const update of sourceUpdates) await fs.writeFile(update.file, update.contents);
      const manifestAssets = items.map(item => {
        const manifestItem = { ...item };
        delete manifestItem.optimized;
        return {
          ...manifestItem,
          active: true,
          displayOrder: item.placement.order,
          references: item.sourcePaths.map(sourcePath => ({ sourcePath, sourceFiles: refs.get(sourcePath) || [], page: item.placement.page, section: item.placement.section, categorySlug: item.placement.categorySlug, categoryCode: item.placement.categoryCode })),
        };
      });
      const manifest = { version: 1, generatedAt: new Date().toISOString(), cloudName: cloud, assets: manifestAssets };
      await fs.writeFile(OUTPUT_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
      await fs.writeFile(REPORT_PATH, JSON.stringify({ ...summary, cloudinaryPlan: "Free", completedAt: new Date().toISOString(), uploadedReferences: replacedReferences, updatedSourceFiles: sourceUpdates.length, sourceReferencesReplaced: true, manifest: path.relative(ROOT, OUTPUT_MANIFEST) }, null, 2) + "\n");
    }
  } else {
    const dryRunReport = { mode: "dry-run", cloudinaryPlan: "Free; no upgrade or source upload performed", generatedAt: new Date().toISOString(), ...summary, plannedAssets: items.map(item => ({ sourcePath: item.sourcePath, sourcePaths: item.sourcePaths, referenceFiles: item.referenceFiles, publicId: item.publicId, optimizedBytes: item.optimizedBytes, width: item.width, height: item.height, placement: item.placement })) };
    await fs.writeFile(path.join(ROOT, "reports/cloudinary-image-migration-dry-run.json"), JSON.stringify(dryRunReport, null, 2) + "\n");
    console.log(JSON.stringify({ ...dryRunReport, plannedAssets: undefined }, null, 2));
  }
}
