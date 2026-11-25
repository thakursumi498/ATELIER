import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { DESIGN_CATEGORY_RECORDS } from "@/lib/designs-catalogue";
import { DRIVE_CATEGORY_ASSETS } from "@/lib/drive-category-assets";
import { buildAdminImageTaxonomy } from "@/lib/admin-image-taxonomy";
import { destroyCloudAsset, fetchCloudinaryAsset, getCachedCloudinaryAssets, managedAsset, mediaReferences, updateCloudinaryContext } from "@/lib/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const query = searchParams.get("q")?.trim().slice(0, 100).toLowerCase() || "";
    const section = searchParams.get("section")?.trim().toLowerCase() || "";
    const categorySlug = searchParams.get("category")?.trim().toLowerCase() || "";
    const subcategorySlug = searchParams.get("subcategory")?.trim().toLowerCase() || "";
    const records = (await getCachedCloudinaryAssets()).map(managedAsset).sort((a, b) => b.id.localeCompare(a.id));
    const taxonomy = buildAdminImageTaxonomy(records);
    const categoryNames = new Map(taxonomy.categories.map((category) => [category.slug, category.name.toLowerCase()]));
    const subcategoryNames = new Map(taxonomy.categories.flatMap((category) => category.subcategories.map((subcategory) => [subcategory.slug, subcategory.name.toLowerCase()] as const)));
    const filtered = records.filter((asset) => {
      if (section && !asset.sectionSlugs.includes(section)) return false;
      if (categorySlug && asset.categorySlug !== categorySlug) return false;
      if (subcategorySlug && asset.subcategorySlug !== subcategorySlug) return false;
      if (!query) return true;
      return [asset.altText, asset.originalFilename, asset.publicId, asset.categorySlug, categoryNames.get(asset.categorySlug), asset.artworkCode, asset.subcategoryName, subcategoryNames.get(asset.subcategorySlug), ...asset.sectionSlugs]
        .some((value) => value?.toLowerCase().includes(query));
    });
    const pageSize = 24;
    const assets = filtered.slice((page - 1) * pageSize, page * pageSize);
    return NextResponse.json({ ok: true, assets, total: filtered.length, totalManagedImages: records.length, page, pageSize, taxonomy }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Cloudinary image library is unavailable." }, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (typeof body.id !== "string" || body.id.length > 250) return NextResponse.json({ ok: false, error: "Choose a valid image." }, { status: 400, headers });
    const asset = await fetchCloudinaryAsset(body.id);
    if (!asset) return NextResponse.json({ ok: false, error: "Image not found in the managed Cloudinary folder." }, { status: 404, headers });
    const context = { ...((asset.context?.custom || {}) as Record<string, string>) };
    const tags = [...(asset.tags || [])];
    if (body.altText !== undefined) {
      if (typeof body.altText !== "string" || body.altText.trim().length > 500) return NextResponse.json({ ok: false, error: "Alt text must be under 500 characters." }, { status: 400, headers });
      context.alt = body.altText.trim();
    }
    if (body.displayOrder !== undefined) {
      const order = Number(body.displayOrder);
      if (!Number.isInteger(order) || order < 0 || order > 9999) return NextResponse.json({ ok: false, error: "Display order must be between 0 and 9999." }, { status: 400, headers });
      context.display_order = String(order);
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") return NextResponse.json({ ok: false, error: "Active must be true or false." }, { status: 400, headers });
      context.active = String(body.active);
    }
    if (body.categorySlug !== undefined || body.subcategorySlug !== undefined) {
      const selectedSlug = typeof body.categorySlug === "string" ? body.categorySlug : context.category_slug || "";
      const category = DESIGN_CATEGORY_RECORDS.find((item) => item.slug === selectedSlug);
      const taxonomy = buildAdminImageTaxonomy([]);
      const configuredCategory = taxonomy.categories.find((item) => item.slug === selectedSlug);
      const subcategorySlug = typeof body.subcategorySlug === "string" ? body.subcategorySlug : "";
      const subcategory = configuredCategory?.subcategories.find((item) => item.slug === subcategorySlug);
      if (!category) return NextResponse.json({ ok: false, error: "Choose a public design category." }, { status: 400, headers });
      if (configuredCategory?.subcategories.length && !subcategory) return NextResponse.json({ ok: false, error: "Choose a subcategory from this category." }, { status: 400, headers });
      if (subcategorySlug && !subcategory) return NextResponse.json({ ok: false, error: "That subcategory does not belong to this category." }, { status: 400, headers });

      const currentCategory = context.category_slug || "";
      let artworkCode = (context.artwork_code || "").toUpperCase();
      if (!artworkCode || currentCategory !== category.slug) {
        const allAssets = await getCachedCloudinaryAssets();
        const staticCodes = new Set((DRIVE_CATEGORY_ASSETS.find((item) => item.slug === category.slug)?.images || []).map((image) => image.code.toUpperCase()));
        const usedCodes = new Set(allAssets.filter((item) => item.public_id !== asset.public_id).map((item) => item.context?.custom?.artwork_code || "").map((code) => code.toUpperCase()));
        for (const code of staticCodes) usedCodes.add(code);
        let index = 1;
        artworkCode = `AE${String(category.slotNumber).padStart(2, "0")}-${String(index).padStart(2, "0")}`;
        while (usedCodes.has(artworkCode)) {
          index += 1;
          artworkCode = `AE${String(category.slotNumber).padStart(2, "0")}-${String(index).padStart(2, "0")}`;
        }
      }
      if (currentCategory && currentCategory !== category.slug && context.artwork_code) {
        const originalCode = context.original_artwork_code || context.artwork_code;
        const originalSlug = context.original_category_slug || currentCategory;
        const isStaticArtwork = DRIVE_CATEGORY_ASSETS.find((item) => item.slug === originalSlug)?.images.some((image) => image.code.toUpperCase() === originalCode.toUpperCase()) ?? false;
        if (isStaticArtwork && !(originalSlug === category.slug && originalCode.toUpperCase() === artworkCode)) {
          context.original_category_slug = originalSlug;
          context.original_artwork_code = originalCode.toUpperCase();
          context.replaces_category_slug = originalSlug;
          context.replaces_artwork_code = originalCode.toUpperCase();
        }
      }
      context.placement = "design";
      context.page = "explore-designs";
      context.section = "catalogue";
      context.category_slug = category.slug;
      context.category_code = category.slotCode;
      context.artwork_code = artworkCode;
      context.subcategory_slug = subcategory?.slug || "";
      context.subcategory_name = subcategory?.name || "";
      if (context.replaces_category_slug === category.slug && context.replaces_artwork_code === artworkCode) {
        delete context.replaces_category_slug;
        delete context.replaces_artwork_code;
        delete context.original_category_slug;
        delete context.original_artwork_code;
      }
      const managedTags = ["atelier-site", "explore-designs", "catalogue", category.slug, artworkCode.toLowerCase()];
      if (subcategory) managedTags.push(subcategory.slug);
      const taxonomySlugs = new Set(taxonomy.categories.map((item) => item.slug));
      const oldSubcategorySlug = asset.context?.custom?.subcategory_slug || "";
      const preservedTags = (asset.tags || []).filter((tag) =>
        !taxonomySlugs.has(tag) && tag !== oldSubcategorySlug && tag !== (asset.context?.custom?.artwork_code || "").toLowerCase() && !["explore-designs", "catalogue"].includes(tag),
      );
      await updateCloudinaryContext(asset, context, [...new Set([...preservedTags, ...managedTags])]);
      revalidateTag("atelier-cloudinary-assets", { expire: 0 });
      return NextResponse.json({ ok: true, moved: true, artworkCode }, { headers });
    }
    await updateCloudinaryContext(asset, context, tags);
    revalidateTag("atelier-cloudinary-assets", { expire: 0 });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not update image details." }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const ids = [...new Set(new URL(request.url).searchParams.getAll("id").filter(Boolean))];
    if (!ids.length) return NextResponse.json({ ok: false, error: "Choose one or more images." }, { status: 400, headers });
    if (ids.length > 50) return NextResponse.json({ ok: false, error: "Delete up to 50 unused images at a time." }, { status: 400, headers });
    const assets = await Promise.all(ids.map((id) => fetchCloudinaryAsset(id)));
    if (assets.some((asset) => !asset)) return NextResponse.json({ ok: false, error: "One or more images were not found in the managed Cloudinary folder." }, { status: 404, headers });
    const protectedAssets = assets.flatMap((asset) => {
      if (!asset) return [];
      const references = mediaReferences(asset.public_id);
      const context = asset.context?.custom || {};
      if (references.length || (context.placement === "design" && context.active !== "false")) {
        return [{ id: asset.public_id, references }];
      }
      return [];
    });
    if (protectedAssets.length) return NextResponse.json({ ok: false, error: "Some selected images are used by the website and were not deleted. Replace or deactivate those images first.", protected: protectedAssets }, { status: 409, headers });

    const deleted: string[] = [];
    for (const asset of assets) {
      if (!asset) continue;
      try {
        await destroyCloudAsset(asset.public_id);
        deleted.push(asset.public_id);
      } catch {
        revalidateTag("atelier-cloudinary-assets", { expire: 0 });
        return NextResponse.json({ ok: false, deleted, error: `${deleted.length} image${deleted.length === 1 ? " was" : "s were"} deleted before Cloudinary stopped the remaining deletion.` }, { status: 503, headers });
      }
    }
    revalidateTag("atelier-cloudinary-assets", { expire: 0 });
    return NextResponse.json({ ok: true, deleted: deleted.length }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not delete the unused image from Cloudinary." }, { status: 503, headers });
  }
}
