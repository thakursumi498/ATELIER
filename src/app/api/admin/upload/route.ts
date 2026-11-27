import crypto from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { DESIGN_CATEGORY_RECORDS, DEVELOPMENT_FIXTURE_DESIGNS } from "@/lib/designs-catalogue";
import { DRIVE_CATEGORY_ASSETS } from "@/lib/drive-category-assets";
import { buildAdminImageTaxonomy } from "@/lib/admin-image-taxonomy";
import { DEVELOPMENT_PROJECT_FIXTURES } from "@/lib/projects-catalogue";
import {
  cloudinaryDeliveryUrl,
  destroyCloudAsset,
  fetchCloudinaryAssetByKey,
  getCachedCloudinaryAssets,
  invalidateCloudinaryAssetCache,
  renameCloudAsset,
  updateCloudinaryContext,
  uploadCloudinaryImage,
} from "@/lib/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 50_000_000;

function safeFilename(value: string) {
  return value.replace(/[\x00-\x1f]/g, "").slice(0, 200) || "image.webp";
}

function nextArtworkCode(categorySlot: number, usedCodes: Set<string>) {
  let index = 1;
  let code = `AE${String(categorySlot).padStart(2, "0")}-${String(index).padStart(2, "0")}`;
  while (usedCodes.has(code)) {
    index += 1;
    code = `AE${String(categorySlot).padStart(2, "0")}-${String(index).padStart(2, "0")}`;
  }
  return code;
}

function idempotencyFingerprint(input: Buffer, destination: Record<string, string>) {
  return crypto.createHash("sha256").update(input).update(JSON.stringify(destination)).digest("hex");
}

function verifiedImageResponse(response: Response) {
  return response.ok && Boolean(response.headers.get("content-type")?.startsWith("image/"));
}

async function repeatedUploadResponse(asset: Awaited<ReturnType<typeof getCachedCloudinaryAssets>>[number], fingerprint: string) {
  const context = asset.context?.custom || {};
  if (context.upload_request_fingerprint !== fingerprint) return NextResponse.json({ ok: false, error: "This upload could not be retried safely. Choose the image again." }, { status: 409, headers });
  if (context.upload_request_status === "complete") return NextResponse.json({ ok: true, duplicate: true }, { headers });
  if (context.upload_request_status !== "pending") return NextResponse.json({ ok: false, error: "This upload could not be retried safely. Choose the image again." }, { status: 409, headers });
  const response = await fetch(cloudinaryDeliveryUrl(asset.public_id), { method: "HEAD", signal: AbortSignal.timeout(20000) });
  if (!verifiedImageResponse(response)) return NextResponse.json({ ok: false, error: "Unable to upload this image. Please try again." }, { status: 503, headers });
  await updateCloudinaryContext(asset, { ...context, upload_request_status: "complete" }, asset.tags || []);
  invalidateCloudinaryAssetCache();
  return NextResponse.json({ ok: true, duplicate: true }, { headers });
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  let stagedPublicId: string | null = null;
  let stagedCreated = false;
  let replacementTargetPublicId: string | null = null;
  let replacementBackupPublicId: string | null = null;
  let resumedReplacement: Awaited<ReturnType<typeof getCachedCloudinaryAssets>>[number] | null = null;
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 64 * 1024) return NextResponse.json({ ok: false, error: "This image is larger than 5 MB." }, { status: 413, headers });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return NextResponse.json({ ok: false, error: "Choose a JPG, PNG or WebP image." }, { status: 400, headers });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "This image is larger than 5 MB." }, { status: 413, headers });

    const input = Buffer.from(await file.arrayBuffer());
    let metadata: { width?: number; height?: number; format?: string };
    try {
      metadata = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
    } catch {
      return NextResponse.json({ ok: false, error: "Choose a valid JPG, PNG or WebP image." }, { status: 400, headers });
    }
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS || !["jpeg", "png", "webp"].includes(metadata.format || "")) {
      return NextResponse.json({ ok: false, error: "Choose a valid JPG, PNG or WebP image." }, { status: 400, headers });
    }

    let optimizedData: Buffer;
    let optimizedWidth = 0;
    let optimizedHeight = 0;
    try {
      const optimized = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, effort: 5, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      optimizedData = optimized.data;
      optimizedWidth = optimized.info.width;
      optimizedHeight = optimized.info.height;
    } catch {
      return NextResponse.json({ ok: false, error: "Choose a valid JPG, PNG or WebP image." }, { status: 400, headers });
    }
    if (!optimizedWidth || !optimizedHeight || !optimizedData.length) return NextResponse.json({ ok: false, error: "Choose a valid JPG, PNG or WebP image." }, { status: 400, headers });

    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || crypto.randomUUID();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) return NextResponse.json({ ok: false, error: "Unable to upload this image. Please try again." }, { status: 400, headers });
    const altInput = String(form.get("altText") || "").trim().slice(0, 500);
    const replaceKey = String(form.get("replaceId") || "").trim();

    let targetPublicId: string | null = null;
    let publicId: string;
    let context: Record<string, string>;
    let tags: string[];
    let fingerprintDestination: Record<string, string>;

    if (replaceKey) {
      if (!/^[A-Za-z0-9_-]{40,400}$/.test(replaceKey)) return NextResponse.json({ ok: false, error: "Refresh the page and choose the image again." }, { status: 400, headers });
      const existing = await fetchCloudinaryAssetByKey(replaceKey);
      if (!existing) return NextResponse.json({ ok: false, error: "The image could not be found. Refresh the page and try again." }, { status: 404, headers });
      targetPublicId = existing.public_id;
      replacementTargetPublicId = existing.public_id;
      context = { ...(existing.context?.custom || {}) };
      tags = existing.tags || ["atelier-site"];
      const altText = altInput || context.alt || "Website image";
      fingerprintDestination = { replace: existing.public_id, altText };
      const existingAssets = await getCachedCloudinaryAssets();
      const fingerprint = idempotencyFingerprint(input, fingerprintDestination);
      if (existing.context?.custom?.upload_request_id === idempotencyKey) {
        return await repeatedUploadResponse(existing, fingerprint);
      }
      const repeated = existingAssets.find((asset) => asset.context?.custom?.upload_request_id === idempotencyKey);
      if (repeated) {
        if (repeated.public_id === existing.public_id) return await repeatedUploadResponse(repeated, fingerprint);
        if (repeated.context?.custom?.upload_request_fingerprint !== fingerprint || repeated.context?.custom?.upload_request_status !== "replacement-staged" || repeated.context?.custom?.replacement_target_public_id !== existing.public_id) {
          return NextResponse.json({ ok: false, error: "This upload could not be retried safely. Choose the image again." }, { status: 409, headers });
        }
        resumedReplacement = repeated;
        publicId = repeated.public_id;
        stagedPublicId = repeated.public_id;
        stagedCreated = true;
      } else {
        publicId = `atelier-wall-story/replacements/${crypto.randomUUID()}`;
        stagedPublicId = publicId;
      }
      context = { ...context, alt: altText, original_filename: safeFilename(file.name), active: context.active || "true" };
    } else {
      const placement = String(form.get("placement") || "");
      if (placement === "design") {
        const assets = await getCachedCloudinaryAssets();
        const selectedSlug = String(form.get("categorySlug") || "").trim().toLowerCase();
        const category = DESIGN_CATEGORY_RECORDS.find((item) => item.slug === selectedSlug);
        if (!category) return NextResponse.json({ ok: false, error: "Open a design category before adding images." }, { status: 400, headers });
        const categoryTaxonomy = buildAdminImageTaxonomy([]).categories.find((item) => item.slug === category.slug);
        const subcategorySlug = String(form.get("subcategorySlug") || "").trim().toLowerCase();
        const subcategory = subcategorySlug ? categoryTaxonomy?.subcategories.find((item) => item.slug === subcategorySlug) : undefined;
        if (subcategorySlug && !subcategory) return NextResponse.json({ ok: false, error: "Choose a subcategory in this category." }, { status: 400, headers });
        const altText = altInput || `Wall art for ${subcategory?.name || category.name}`;
        fingerprintDestination = { placement, categorySlug: category.slug, subcategorySlug: subcategory?.slug || "", altText };
        const fingerprint = idempotencyFingerprint(input, fingerprintDestination);
        const repeated = assets.find((asset) => asset.context?.custom?.upload_request_id === idempotencyKey);
        if (repeated) {
          if (repeated.context?.custom?.placement !== "design" || repeated.context.custom.category_slug !== category.slug || repeated.context.custom.subcategory_slug !== (subcategory?.slug || "")) return NextResponse.json({ ok: false, error: "This upload could not be retried safely. Choose the image again." }, { status: 409, headers });
          return await repeatedUploadResponse(repeated, fingerprint);
        }
        const usedCodes = new Set([
          ...(DRIVE_CATEGORY_ASSETS.find((item) => item.slug === category.slug)?.images.map((image) => image.code) || []),
          ...assets.map((asset) => asset.context?.custom?.artwork_code || ""),
        ].map((code) => code.toUpperCase()));
        const artworkCode = nextArtworkCode(category.slotNumber, usedCodes);
        if (!new RegExp(`^AE${String(category.slotNumber).padStart(2, "0")}-\\d{2}$`).test(artworkCode)) return NextResponse.json({ ok: false, error: "This category has reached its image limit." }, { status: 409, headers });
        const staticOrder = DEVELOPMENT_FIXTURE_DESIGNS.filter((design) => design.categorySlug === category.slug).reduce((highest, design) => Math.max(highest, design.sortOrder), 0);
        const managedOrder = assets.filter((asset) => asset.context?.custom?.placement === "design" && asset.context?.custom?.category_slug === category.slug).reduce((highest, asset) => Math.max(highest, Number(asset.context?.custom?.display_order || 0)), 0);
        const order = Math.min(9999, Math.max(staticOrder, managedOrder) + 1);
        const folderSubcategory = subcategory?.slug || "unassigned";
        publicId = `atelier-wall-story/designs/${category.slug}/${folderSubcategory}/${artworkCode}`;
        context = { alt: altText, original_filename: safeFilename(file.name), placement: "design", page: "explore-designs", section: "catalogue", category_slug: category.slug, category_name: category.name, category_code: category.slotCode, artwork_code: artworkCode, subcategory_slug: subcategory?.slug || "", subcategory_name: subcategory?.name || "", display_order: String(order), active: "true" };
        tags = ["atelier-site", "explore-designs", "catalogue", category.slug, ...(subcategory ? [subcategory.slug] : []), artworkCode.toLowerCase()];
      } else if (placement === "project-gallery") {
        const assets = await getCachedCloudinaryAssets();
        const projectSlug = String(form.get("projectSlug") || "").trim().toLowerCase();
        const project = DEVELOPMENT_PROJECT_FIXTURES.find((item) => item.published && item.slug === projectSlug);
        if (!project) return NextResponse.json({ ok: false, error: "Open a project gallery before adding images." }, { status: 400, headers });
        const altText = altInput || `Project gallery image for ${project.shortTitle || project.title}`;
        fingerprintDestination = { placement, projectSlug: project.slug, altText };
        const fingerprint = idempotencyFingerprint(input, fingerprintDestination);
        const repeated = assets.find((asset) => asset.context?.custom?.upload_request_id === idempotencyKey);
        if (repeated) {
          if (repeated.context?.custom?.placement !== "project-gallery" || repeated.context.custom.project_slug !== project.slug) return NextResponse.json({ ok: false, error: "This upload could not be retried safely. Choose the image again." }, { status: 409, headers });
          return await repeatedUploadResponse(repeated, fingerprint);
        }
        const managedOrder = assets.filter((asset) => asset.context?.custom?.placement === "project-gallery" && asset.context?.custom?.project_slug === project.slug).reduce((highest, asset) => Math.max(highest, Number(asset.context?.custom?.display_order || 0)), project.galleryMedia.length - 1);
        const order = Math.min(9999, managedOrder + 1);
        const filenameBase = crypto.randomUUID();
        publicId = `atelier-wall-story/projects/managed/${project.slug}/${filenameBase}`;
        context = { alt: altText, original_filename: safeFilename(file.name), placement: "project-gallery", page: "projects", section: "project-gallery", project_slug: project.slug, project_name: project.shortTitle || project.title, display_order: String(order), active: "true" };
        tags = ["atelier-site", "projects", "project-gallery", project.slug];
      } else {
        return NextResponse.json({ ok: false, error: "Open a website gallery before adding images." }, { status: 400, headers });
      }
    }

    const fingerprint = idempotencyFingerprint(input, fingerprintDestination);
    context.source_bytes = String(input.length);
    context.optimized_bytes = String(optimizedData.length);
    context.compression_saved_bytes = String(Math.max(0, input.length - optimizedData.length));
    const uploadPublicId = targetPublicId ? stagedPublicId! : publicId;
    const uploadContext: Record<string, string> = targetPublicId
      ? { alt: "Temporary image replacement", original_filename: "temporary-image-replacement.webp", placement: "replacement-staging", page: "admin-library", section: "uploads", active: "false", upload_request_id: idempotencyKey, upload_request_fingerprint: fingerprint, upload_request_status: "replacement-staged", replacement_target_public_id: targetPublicId }
      : { ...context, upload_request_id: idempotencyKey, upload_request_fingerprint: fingerprint, upload_request_status: "pending" };
    const uploaded = resumedReplacement || await uploadCloudinaryImage({ bytes: optimizedData, publicId: uploadPublicId, overwrite: false, context: uploadContext, tags: targetPublicId ? ["atelier-site", "admin-library", "replacement-staging"] : tags, filename: "optimized.webp" });
    if (!resumedReplacement) stagedCreated = true;
    invalidateCloudinaryAssetCache();
    const stagedResponse = await fetch(cloudinaryDeliveryUrl(uploadPublicId), { method: "HEAD", signal: AbortSignal.timeout(20000) });
    if (!verifiedImageResponse(stagedResponse)) throw new Error("Image could not be verified.");

    if (targetPublicId && stagedPublicId) {
      const backupId = `atelier-wall-story/replacements/previous-${crypto.randomUUID()}`;
      await renameCloudAsset(targetPublicId, backupId);
      replacementBackupPublicId = backupId;
      try {
        await renameCloudAsset(stagedPublicId, targetPublicId);
        stagedPublicId = null;
        stagedCreated = false;
        const targetAsset = { ...uploaded, public_id: targetPublicId, context: { custom: context }, tags };
        const targetResponse = await fetch(cloudinaryDeliveryUrl(targetPublicId), { method: "HEAD", signal: AbortSignal.timeout(20000) });
        if (!verifiedImageResponse(targetResponse)) throw new Error("Image could not be verified.");
        const completeContext = { ...context, upload_request_id: idempotencyKey, upload_request_fingerprint: fingerprint, upload_request_status: "complete" };
        await updateCloudinaryContext(targetAsset, completeContext, tags);
        await destroyCloudAsset(backupId).then(() => {
          replacementBackupPublicId = null;
        }).catch(async () => {
          const backupAsset = { ...uploaded, public_id: backupId, context: { custom: context }, tags };
          const hiddenContext = { alt: "Previous website image", original_filename: "previous-website-image.webp", placement: "replacement-staging", page: "admin-library", section: "replacement-recovery", active: "false" };
          await updateCloudinaryContext(backupAsset, hiddenContext, ["atelier-site", "replacement-recovery"]).catch(() => undefined);
          replacementBackupPublicId = null;
        });
      } catch (error) {
        try {
          await renameCloudAsset(backupId, targetPublicId, true);
          replacementBackupPublicId = null;
        } catch {
          console.error("Image replacement recovery did not complete. The previous image remains in the private recovery folder.");
        }
        throw error;
      }
    } else {
      const completeContext = { ...context, upload_request_id: idempotencyKey, upload_request_fingerprint: fingerprint, upload_request_status: "complete" };
      await updateCloudinaryContext(uploaded, completeContext, tags);
      stagedPublicId = null;
      stagedCreated = false;
    }

    invalidateCloudinaryAssetCache();
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    if (stagedPublicId && stagedCreated) await destroyCloudAsset(stagedPublicId).catch(() => undefined);
    if (replacementBackupPublicId && replacementTargetPublicId) {
      await renameCloudAsset(replacementBackupPublicId, replacementTargetPublicId, true).catch(() => {
        console.error("Image replacement recovery did not complete. The previous image remains in the private recovery folder.");
      });
    }
    return NextResponse.json({ ok: false, error: "Unable to upload this image. Please try again." }, { status: 503, headers });
  }
}
