import { NextResponse } from "next/server";
import { getCachedCloudinaryAssets, customContext, cloudinaryDeliveryUrl } from "@/lib/media-store";
import { DESIGN_CATEGORY_RECORDS } from "@/lib/designs-catalogue";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cloudAssets = await getCachedCloudinaryAssets();
    const images = cloudAssets.flatMap(asset => {
      const context = customContext(asset);
      if (!context.category_slug || !context.artwork_code || context.placement !== "design" || !DESIGN_CATEGORY_RECORDS.some(category => category.slug === context.category_slug) || !asset.public_id.startsWith("atelier-wall-story/")) return [];
      const url = cloudinaryDeliveryUrl(asset.public_id);
      const contextSlug = context.subcategory_slug || "";
      const contextName = context.subcategory_name || "";
      return [{
        id: asset.public_id,
        publicId: asset.public_id,
        secureUrl: url,
        altText: context.alt || context.artwork_code,
        width: Number(asset.width || 0),
        height: Number(asset.height || 0),
        format: asset.format || "webp",
        categorySlug: context.category_slug,
        artworkCode: context.artwork_code,
        subcategorySlug: contextSlug,
        subcategoryName: contextName,
        replacesCategorySlug: context.replaces_category_slug || "",
        replacesArtworkCode: context.replaces_artwork_code || "",
        displayOrder: Number(context.display_order || 0),
        active: context.active !== "false",
      }];
    });
    return NextResponse.json({ ok: true, images }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ ok: false, error: "The image catalogue is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  }
}
