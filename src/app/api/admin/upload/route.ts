import crypto from "node:crypto";
import sharp from "sharp";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { DEVELOPMENT_FIXTURE_DESIGNS, DESIGN_CATEGORY_RECORDS } from "@/lib/designs-catalogue";
import { buildAdminImageTaxonomy, WEBSITE_IMAGE_SECTIONS } from "@/lib/admin-image-taxonomy";
import { cloudinaryDeliveryUrl, fetchCloudinaryAsset, getCachedCloudinaryAssets, managedAsset, uploadCloudinaryImage } from "@/lib/media-store";

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

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 64 * 1024) return NextResponse.json({ ok: false, error: "Each image must be 5 MB or smaller." }, { status: 413, headers });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Select one image that is 5 MB or smaller." }, { status: 400, headers });
    const input = Buffer.from(await file.arrayBuffer());
    const inputImage = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const metadata = await inputImage.metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS || !["jpeg", "png", "webp"].includes(metadata.format || "")) {
      return NextResponse.json({ ok: false, error: "Use a valid JPG, PNG, or WebP image under 50 megapixels." }, { status: 400, headers });
    }
    const optimized = await inputImage.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 84, effort: 5, smartSubsample: true }).toBuffer({ resolveWithObject: true });
    if (!optimized.info.width || !optimized.info.height || !optimized.data.length) throw new Error("Image optimization failed.");
    await sharp(optimized.data, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();

    const altText = String(form.get("altText") || file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 500);
    const replaceId = String(form.get("replaceId") || "").trim();
    let publicId: string;
    let context: Record<string, string>;
    let tags: string[];
    let overwrite = false;

    if (replaceId) {
      const existing = await fetchCloudinaryAsset(replaceId);
      if (!existing) return NextResponse.json({ ok: false, error: "The image to replace was not found in the managed Cloudinary folder." }, { status: 404, headers });
      publicId = existing.public_id;
      context = { ...(existing.context?.custom || {}), alt: altText, original_filename: safeFilename(file.name), active: (existing.context?.custom?.active || "true") };
      tags = existing.tags || ["atelier-site"];
      overwrite = true;
    } else {
      const placement = String(form.get("placement") || "library");
      const selectedSlug = String(form.get("categorySlug") || "");
      if (placement === "design") {
        const category = DESIGN_CATEGORY_RECORDS.find((item) => item.slug === selectedSlug);
        if (!category) return NextResponse.json({ ok: false, error: "Choose an available design category." }, { status: 400, headers });
        const categoryTaxonomy = buildAdminImageTaxonomy([]).categories.find((item) => item.slug === category.slug);
        const subcategorySlug = String(form.get("subcategorySlug") || "").trim().toLowerCase();
        const subcategory = categoryTaxonomy?.subcategories.find((item) => item.slug === subcategorySlug);
        if (categoryTaxonomy?.subcategories.length && !subcategory) return NextResponse.json({ ok: false, error: "Choose a subcategory from the selected category." }, { status: 400, headers });
        if (subcategorySlug && !subcategory) return NextResponse.json({ ok: false, error: "That subcategory does not belong to the selected category." }, { status: 400, headers });
        const existing = await getCachedCloudinaryAssets();
        const usedCodes = new Set([
          ...DEVELOPMENT_FIXTURE_DESIGNS.filter((design) => design.categorySlotNumber === category.slotNumber).map((design) => design.artworkCode || ""),
          ...existing.map((asset) => asset.context?.custom?.artwork_code || ""),
        ].map((code) => code.toUpperCase()));
        const requestedCode = String(form.get("artworkCode") || "").trim().toUpperCase();
        const artworkCode = requestedCode || nextArtworkCode(category.slotNumber, usedCodes);
        if (!new RegExp(`^AE${String(category.slotNumber).padStart(2, "0")}-\\d{2}$`).test(artworkCode) || usedCodes.has(artworkCode)) {
          return NextResponse.json({ ok: false, error: "That artwork code is invalid or already in use for this category." }, { status: 409, headers });
        }
        const order = Math.max(0, Math.min(9999, Number(form.get("displayOrder")) || 0));
        const folderSubcategory = subcategory?.slug || "unassigned";
        publicId = `atelier-wall-story/designs/${category.slug}/${folderSubcategory}/${artworkCode}`;
        context = { alt: altText || `${category.name} ${artworkCode}`, original_filename: safeFilename(file.name), placement: "design", page: "explore-designs", section: "catalogue", category_slug: category.slug, category_name: category.name, category_code: category.slotCode, artwork_code: artworkCode, subcategory_slug: subcategory?.slug || "", subcategory_name: subcategory?.name || "", display_order: String(order), active: "true" };
        tags = ["atelier-site", "explore-designs", "catalogue", category.slug, ...(subcategory ? [subcategory.slug] : []), artworkCode.toLowerCase()];
      } else if (placement === "section-library") {
        const page = String(form.get("page") || "").trim().toLowerCase();
        const section = WEBSITE_IMAGE_SECTIONS.find((item) => item.slug === page && !["explore-designs", "other", "library"].includes(item.slug));
        if (!section) return NextResponse.json({ ok: false, error: "Choose a website section from the list." }, { status: 400, headers });
        publicId = `atelier-wall-story/uploads/${crypto.randomUUID()}`;
        context = { alt: altText, original_filename: safeFilename(file.name), placement: "library", page: section.slug, section: "uploads", display_order: String(Math.max(0, Number(form.get("displayOrder")) || 0)), active: "false" };
        tags = ["atelier-site", "admin-library", section.slug];
      } else {
        publicId = `atelier-wall-story/uploads/${crypto.randomUUID()}`;
        context = { alt: altText, original_filename: safeFilename(file.name), placement: "library", page: "admin-library", section: "uploads", display_order: String(Math.max(0, Number(form.get("displayOrder")) || 0)), active: "false" };
        tags = ["atelier-site", "admin-library"];
      }
    }

    context.source_bytes = String(input.length);
    context.optimized_bytes = String(optimized.data.length);
    context.compression_saved_bytes = String(Math.max(0, input.length - optimized.data.length));
    const uploaded = await uploadCloudinaryImage({ bytes: optimized.data, publicId, overwrite, context, tags, filename: "optimized.webp" });
    const deliveryUrl = cloudinaryDeliveryUrl(publicId);
    const verify = await fetch(deliveryUrl, { method: "HEAD", signal: AbortSignal.timeout(20000) });
    if (!verify.ok || !verify.headers.get("content-type")?.startsWith("image/")) throw new Error("Cloudinary image upload could not be verified.");
    revalidateTag("atelier-cloudinary-assets", { expire: 0 });
    const media = managedAsset({ ...uploaded, public_id: publicId, secure_url: deliveryUrl, format: "webp", width: optimized.info.width, height: optimized.info.height, bytes: optimized.data.length, context: { custom: context }, tags });
    return NextResponse.json({ ok: true, media, compression: { inputBytes: input.length, optimizedBytes: optimized.data.length, savedBytes: Math.max(0, input.length - optimized.data.length) } }, { headers });
  } catch (error) {
    const message = error instanceof Error && /not configured/.test(error.message) ? error.message : "Image could not be optimized or uploaded. Check the image and Cloudinary configuration.";
    return NextResponse.json({ ok: false, error: message }, { status: 503, headers });
  }
}
