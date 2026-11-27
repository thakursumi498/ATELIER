import { NextResponse } from "next/server";
import { getCachedCloudinaryAssets, customContext, cloudinaryDeliveryUrl, managedAsset } from "@/lib/media-store";
import { DESIGN_CATEGORY_RECORDS, DEVELOPMENT_FIXTURE_DESIGNS, isDuplicateSourceArtwork, type ManagedCatalogueImage } from "@/lib/designs-catalogue";
import { DEVELOPMENT_PROJECT_FIXTURES } from "@/lib/projects-catalogue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET() {
  try {
    const cloudAssets = await getCachedCloudinaryAssets();
    const images = cloudAssets.flatMap((asset): ManagedCatalogueImage[] => {
      const context = customContext(asset);
      const managed = managedAsset(asset);
      if (context.upload_request_id && context.upload_request_status !== "complete") return [];
      if (!asset.public_id.startsWith("atelier-wall-story/")) return [];
      if (isDuplicateSourceArtwork(managed.categorySlug, managed.artworkCode)) return [];
      const url = cloudinaryDeliveryUrl(asset.public_id);
      if (managed.placement === "project-gallery" && asset.public_id.startsWith("atelier-wall-story/projects/managed/") && DEVELOPMENT_PROJECT_FIXTURES.some((project) => project.published && project.slug === managed.projectSlug)) {
        return [{
          id: asset.public_id,
          publicId: asset.public_id,
          secureUrl: url,
          altText: context.alt || `${managed.projectName || "Project"} gallery image`,
          width: Number(asset.width || 0),
          height: Number(asset.height || 0),
          format: asset.format || "webp",
          categorySlug: "",
          artworkCode: "",
          subcategorySlug: "",
          subcategoryName: "",
          replacesCategorySlug: "",
          replacesArtworkCode: "",
          projectSlug: managed.projectSlug,
          placement: "project-gallery" as const,
          displayOrder: Number(context.display_order ?? managed.displayOrder),
          active: managed.active,
        }];
      }
      if (!asset.public_id.startsWith("atelier-wall-story/designs/") || !managed.categorySlug || !managed.artworkCode || managed.placement !== "design" || !DESIGN_CATEGORY_RECORDS.some(category => category.slug === managed.categorySlug)) return [];
      const staticDesign = DEVELOPMENT_FIXTURE_DESIGNS.find((design) => design.categorySlug === managed.categorySlug && design.artworkCode?.toUpperCase() === managed.artworkCode);
      const contextSlug = context.subcategory_slug || managed.subcategorySlug;
      const contextName = context.subcategory_name || managed.subcategoryName;
      return [{
        id: asset.public_id,
        publicId: asset.public_id,
        secureUrl: url,
        altText: context.alt || staticDesign?.coverImage.altText || managed.altText,
        width: Number(asset.width || 0),
        height: Number(asset.height || 0),
        format: asset.format || "webp",
        categorySlug: managed.categorySlug,
        artworkCode: managed.artworkCode,
        subcategorySlug: contextSlug,
        subcategoryName: contextName,
        replacesCategorySlug: context.replaces_category_slug || "",
        replacesArtworkCode: context.replaces_artwork_code || "",
        projectSlug: "",
        placement: "design" as const,
        displayOrder: Number(context.display_order ?? staticDesign?.sortOrder ?? managed.displayOrder),
        active: managed.active,
      }];
    });
    return NextResponse.json({ ok: true, images }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "The image catalogue is temporarily unavailable." }, { status: 503, headers });
  }
}
