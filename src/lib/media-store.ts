import crypto from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import manifest from "@/lib/cloudinary-image-manifest.generated.json";
import { getAssetSectionSlugs, getDesignSubcategory } from "@/lib/admin-image-taxonomy";
import { DEVELOPMENT_PROJECT_FIXTURES } from "@/lib/projects-catalogue";

export interface ManagedMediaAsset {
  id: string;
  publicId: string;
  secureUrl: string;
  resourceType: "image";
  format: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
  compressionSavedBytes: number;
  altText: string;
  originalFilename: string;
  folder: string;
  references: Array<{ sourcePath: string; page: string; section: string; categorySlug: string; categoryCode: string; sourceFiles?: string[] }>;
  categorySlug: string;
  projectSlug: string;
  projectName: string;
  artworkCode: string;
  subcategoryName: string;
  subcategorySlug: string;
  sectionSlugs: string[];
  placement: string;
  displayOrder: number;
  active: boolean;
  tags: string[];
  context: Record<string, string>;
}

export interface CloudinaryAssetRecord {
  public_id: string;
  secure_url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  folder?: string;
  tags?: string[];
  context?: { custom?: Record<string, string> };
  created_at?: string;
}

export interface CloudinaryUsageSnapshot {
  creditsUsed: number;
  creditsLimit: number;
  creditsUsedPercent: number;
  updatedAt: string;
}

export function cloudinaryCredentials() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloud)) {
    throw new Error("Cloud image storage is not configured.");
  }
  return { cloud, apiKey, secret };
}

export function cloudinaryDeliveryUrl(publicId: string, cloud = process.env.CLOUDINARY_CLOUD_NAME) {
  if (!cloud || !publicId.startsWith("atelier-wall-story/")) return "";
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${publicId}.webp`;
}

/** Encrypted operation key keeps provider resource names server-side. */
export function adminMediaKey(publicId: string) {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("Media operations are unavailable.");
  const key = crypto.createHash("sha256").update(`atelier-admin-media:${secret}`).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ publicId, expiresAt: Date.now() + 30 * 60_000 }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function publicIdFromAdminMediaKey(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{40,400}$/.test(value)) return null;
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const key = crypto.createHash("sha256").update(`atelier-admin-media:${secret}`).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8")) as { publicId?: unknown; expiresAt?: unknown };
    if (typeof payload.publicId !== "string" || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null;
    return payload.publicId.startsWith("atelier-wall-story/") && !payload.publicId.includes("..") ? payload.publicId : null;
  } catch {
    return null;
  }
}

export function signCloudinary(params: Record<string, string>, secret: string) {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(canonical + secret).digest("hex");
}

function authHeaders(apiKey: string, secret: string) {
  return { Authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}` };
}

export function customContext(asset: CloudinaryAssetRecord) {
  return asset.context?.custom || {};
}

export async function fetchCloudinaryAssets(): Promise<CloudinaryAssetRecord[]> {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  const resources: CloudinaryAssetRecord[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload`);
    url.searchParams.set("prefix", "atelier-wall-story/");
    url.searchParams.set("max_results", "500");
    url.searchParams.set("context", "true");
    url.searchParams.set("tags", "true");
    if (cursor) url.searchParams.set("next_cursor", cursor);
    const response = await fetch(url, { headers: authHeaders(apiKey, secret), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.resources)) throw new Error("Cloudinary image list is unavailable.");
    resources.push(...result.resources as CloudinaryAssetRecord[]);
    cursor = typeof result.next_cursor === "string" ? result.next_cursor : undefined;
    if (!cursor) break;
  }
  return resources;
}

async function fetchCloudinaryUsage(): Promise<CloudinaryUsageSnapshot> {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, { headers: authHeaders(apiKey, secret), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok || !result.credits || !Number.isFinite(Number(result.credits.used)) || !Number.isFinite(Number(result.credits.limit))) throw new Error("Cloudinary usage is unavailable.");
  return { creditsUsed: Number(result.credits.used), creditsLimit: Number(result.credits.limit), creditsUsedPercent: Number(result.credits.used_percent || 0), updatedAt: String(result.last_updated || new Date().toISOString()) };
}

const cachedCloudinaryAssets = unstable_cache(
  fetchCloudinaryAssets,
  ["atelier-cloudinary-assets-v2", process.env.CLOUDINARY_CLOUD_NAME || "missing-cloud"],
  // Admin edits can come from a different running instance (such as a local
  // studio against the live Cloudinary account), where local tag invalidation
  // cannot clear the website server's cache.
  { revalidate: 15, tags: ["atelier-cloudinary-assets"] },
);

export async function getCachedCloudinaryAssets() {
  try {
    return await cachedCloudinaryAssets();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing in unstable_cache")) return fetchCloudinaryAssets();
    throw error;
  }
}

export function invalidateCloudinaryAssetCache() {
  try {
    revalidateTag("atelier-cloudinary-assets", { expire: 0 });
  } catch (error) {
    if (error instanceof Error && /incrementalCache|static generation store|workAsyncStorage/i.test(error.message)) return;
    throw error;
  }
}

export const getCachedCloudinaryUsage = unstable_cache(
  fetchCloudinaryUsage,
  ["atelier-cloudinary-usage-v1", process.env.CLOUDINARY_CLOUD_NAME || "missing-cloud"],
  { revalidate: 3600, tags: ["atelier-cloudinary-usage"] },
);

export async function fetchCloudinaryAsset(publicId: string): Promise<CloudinaryAssetRecord | null> {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  if (!publicId.startsWith("atelier-wall-story/")) return null;
  const pathId = publicId.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${pathId}?context=true&tags=true`, { headers: authHeaders(apiKey, secret), signal: AbortSignal.timeout(20000) });
  if (response.status === 404) return null;
  const result = await response.json();
  if (!response.ok || typeof result.public_id !== "string") throw new Error("Cloudinary asset lookup failed.");
  return result as CloudinaryAssetRecord;
}

export async function fetchCloudinaryAssetByKey(key: string): Promise<CloudinaryAssetRecord | null> {
  const publicId = publicIdFromAdminMediaKey(key);
  return publicId ? fetchCloudinaryAsset(publicId) : null;
}

export function managedAsset(asset: CloudinaryAssetRecord): ManagedMediaAsset {
  const context = customContext(asset);
  const sourcePath = context.source_path || "";
  const filename = sourcePath.split("/").at(-1) || asset.public_id.split("/").at(-1) || asset.public_id;
  const categorySlug = context.category_slug || asset.public_id.match(/^atelier-wall-story\/designs\/(?:categories\/)?([^/]+)\//)?.[1] || "";
  const artworkCode = (context.artwork_code || asset.public_id.match(/AE\d{2}-\d{2}/i)?.[0] || "").toUpperCase();
  const subcategory = getDesignSubcategory(categorySlug, artworkCode, context);
  const references = mediaReferences(asset.public_id);
  const storedPlacement = context.placement || "";
  const isLibraryAsset = context.section === "uploads" || context.page === "admin-library" || asset.public_id.includes("/admin-library/");
  const placement = storedPlacement === "catalogue" || storedPlacement === "explore-designs"
    ? (categorySlug ? "design" : storedPlacement)
    : storedPlacement || (isLibraryAsset ? "library" : categorySlug ? "design" : asset.public_id.startsWith("atelier-wall-story/projects/managed/") ? "project-gallery" : context.page || (references.length ? "fixed" : "library"));
  const storedProjectSlug = context.project_slug || "";
  const referenceSourcePaths = new Set(references.map((reference) => reference.sourcePath.split("/").at(-1)?.toLowerCase()).filter(Boolean));
  const matchedProject = DEVELOPMENT_PROJECT_FIXTURES.find((project) => project.galleryMedia.some((media) => {
    const mediaFile = (() => {
      try { return new URL(media.secureUrl).pathname.split("/").at(-1)?.replace(/\.webp$|\.[a-z0-9]+$/i, "").toLowerCase(); }
      catch { return media.publicId.split("/").at(-1)?.toLowerCase(); }
    })();
    return Boolean(mediaFile && [...referenceSourcePaths].some((path) => path?.replace(/\.[a-z0-9]+$/i, "") === mediaFile));
  }));
  const projectSlug = storedProjectSlug || matchedProject?.slug || "";
  const projectName = context.project_name || matchedProject?.shortTitle || matchedProject?.title || "";
  const migrationAsset = (manifest.assets as Array<{ publicId: string; sourceBytes?: number; canonicalSourceBytes?: number; optimizedBytes?: number }>).find((item) => item.publicId === asset.public_id);
  const bytes = Number(asset.bytes || 0);
  const originalBytes = Number(context.source_bytes || migrationAsset?.canonicalSourceBytes || migrationAsset?.sourceBytes || bytes);
  return {
    id: asset.public_id,
    publicId: asset.public_id,
    secureUrl: cloudinaryDeliveryUrl(asset.public_id),
    resourceType: "image",
    format: asset.format || "webp",
    width: Number(asset.width || 0),
    height: Number(asset.height || 0),
    bytes,
    originalBytes,
    compressionSavedBytes: Number(context.compression_saved_bytes ?? Math.max(0, originalBytes - bytes)),
    altText: context.alt || filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    originalFilename: context.original_filename || filename,
    folder: asset.folder || asset.public_id.split("/").slice(0, -1).join("/"),
    references,
    categorySlug,
    projectSlug,
    projectName,
    artworkCode,
    subcategoryName: subcategory?.name || "",
    subcategorySlug: subcategory?.slug || "",
    sectionSlugs: getAssetSectionSlugs({ categorySlug, placement, context, references }),
    placement,
    displayOrder: Number(context.display_order || 0),
    active: context.active !== "false",
    tags: asset.tags || [],
    context,
  };
}

const HUMAN_MEDIA_NAMES: Record<string, string> = {
  "visualizer-room-neutral-living": "Living Room",
  "visualizer-room-cream-bedroom": "Bedroom",
  "visualizer-room-angled-gallery": "Gallery",
};

export function humanizeMediaDisplayName(value: string, fallback = "Website image") {
  const cleaned = value.trim().replace(/\.[a-z0-9]+$/i, "");
  if (!cleaned) return fallback;
  const normalized = cleaned.toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  if (HUMAN_MEDIA_NAMES[normalized]) return HUMAN_MEDIA_NAMES[normalized];
  if (/^[a-z0-9-]+$/.test(cleaned)) {
    return cleaned.split(/[-_]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  }
  return cleaned;
}

export function mediaReferences(publicId: string) {
  const entries = manifest.assets as Array<{
    publicId: string;
    references: Array<{ sourcePath: string; page: string; section: string; categorySlug: string; categoryCode: string; sourceFiles?: string[] }>;
  }>;
  return entries.find(asset => asset.publicId === publicId)?.references || [];
}

export function isFixedWebsiteImage(asset: Pick<ManagedMediaAsset, "references"> & Partial<Pick<ManagedMediaAsset, "sectionSlugs" | "placement" | "context">>) {
  const fixedPages = new Set(["home", "services", "about", "process", "visualizer"]);
  const fixedSections = /hero|banner|background|wall[-_ ]?preview/i;
  if (asset.sectionSlugs?.some((section) => fixedPages.has(section))) return true;
  if (asset.references.some((reference) => fixedPages.has(reference.page) || fixedSections.test(reference.section))) return true;
  if (asset.context?.page && fixedPages.has(asset.context.page)) return true;
  if (asset.placement && fixedPages.has(asset.placement)) return true;
  return fixedSections.test(`${asset.context?.section || ""} ${asset.placement || ""}`);
}

export function canToggleManagedAsset(asset: Pick<ManagedMediaAsset, "categorySlug" | "references"> & Partial<Pick<ManagedMediaAsset, "sectionSlugs" | "placement" | "context">>) {
  if (isFixedWebsiteImage(asset)) return false;
  return Boolean(asset.categorySlug) || asset.references.length === 0;
}

export async function uploadCloudinaryImage(options: {
  bytes: Buffer;
  publicId: string;
  overwrite: boolean;
  context: Record<string, string>;
  tags: string[];
  filename: string;
}) {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const context = Object.entries(options.context).map(([key, value]) => `${key}=${String(value).replace(/[|=]/g, " ")}`).join("|");
  const tags = [...new Set(options.tags.map(tag => tag.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 100)).filter(Boolean))].join(",");
  const params = {
    public_id: options.publicId,
    timestamp,
    overwrite: String(options.overwrite),
    invalidate: String(options.overwrite),
    unique_filename: "false",
    tags,
    context,
  };
  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from(options.bytes)], { type: "image/webp" }), options.filename || "optimized.webp");
  for (const [key, value] of Object.entries({ ...params, api_key: apiKey, signature: signCloudinary(params, secret) })) form.append(key, value);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (!response.ok || result.public_id !== options.publicId) throw new Error("Cloudinary upload failed. Please try again.");
  return { ...result, secure_url: cloudinaryDeliveryUrl(options.publicId, cloud) };
}

export async function updateCloudinaryContext(asset: CloudinaryAssetRecord, context: Record<string, string>, tags: string[]) {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  const contextString = Object.entries(context).map(([key, value]) => `${key}=${String(value).replace(/[|=]/g, " ")}`).join("|");
  const tagString = [...new Set(tags)].join(",");
  const pathId = asset.public_id.split("/").map(encodeURIComponent).join("/");
  const form = new URLSearchParams({ context: contextString, tags: tagString });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${pathId}`, { method: "POST", headers: authHeaders(apiKey, secret), body: form, signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok || result.public_id !== asset.public_id) throw new Error("Cloudinary image details could not be updated.");
  return result as CloudinaryAssetRecord;
}

export async function renameCloudAsset(fromPublicId: string, toPublicId: string, overwrite = false) {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  if (!fromPublicId.startsWith("atelier-wall-story/") || !toPublicId.startsWith("atelier-wall-story/")) {
    throw new Error("Image update could not be completed.");
  }
  const params = {
    from_public_id: fromPublicId,
    to_public_id: toPublicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    overwrite: String(overwrite),
    invalidate: "true",
  };
  const form = new URLSearchParams({ ...params, api_key: apiKey, signature: signCloudinary(params, secret) });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/rename`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.public_id !== toPublicId) throw new Error("Image update could not be completed.");
  return result as CloudinaryAssetRecord;
}

export async function destroyCloudAsset(publicId: string) {
  const { cloud, apiKey, secret } = cloudinaryCredentials();
  if (!publicId.startsWith("atelier-wall-story/")) throw new Error("Asset is outside the managed site folder.");
  const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)), invalidate: "true" };
  const form = new URLSearchParams({ ...params, api_key: apiKey, signature: signCloudinary(params, secret) });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body: form, signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok || !["ok", "not found"].includes(result.result)) throw new Error("Cloud asset could not be deleted. Please retry.");
}
