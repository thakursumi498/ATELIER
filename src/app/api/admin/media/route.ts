import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import { buildAdminImageTaxonomy, isWebsiteImageInUse } from "@/lib/admin-image-taxonomy";
import { DESIGN_CATEGORY_RECORDS, DEVELOPMENT_FIXTURE_DESIGNS, isDuplicateSourceArtwork } from "@/lib/designs-catalogue";
import { DRIVE_CATEGORY_ASSETS } from "@/lib/drive-category-assets";
import { adminMediaKey, canToggleManagedAsset, destroyCloudAsset, fetchCloudinaryAssetByKey, fetchCloudinaryAssets, getCachedCloudinaryAssets, humanizeMediaDisplayName, invalidateCloudinaryAssetCache, isFixedWebsiteImage, managedAsset, mediaReferences, updateCloudinaryContext, type CloudinaryAssetRecord } from "@/lib/media-store";
import { readJsonBody } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
const patchSchema = z.union([
  z.object({ action: z.literal("assign"), assetKey: z.string().min(1).max(400), categorySlug: z.string().min(1).max(100), subcategorySlug: z.string().max(100).optional() }).strict(),
  z.object({ action: z.literal("visibility"), assetKey: z.string().min(1).max(400), active: z.boolean() }).strict(),
  z.object({ action: z.literal("visibility-bulk"), assetKeys: z.array(z.string().min(1).max(400)).min(1).max(50).refine((keys) => new Set(keys).size === keys.length), active: z.boolean() }).strict(),
  z.object({ assetKey: z.string().min(1).max(400), active: z.boolean() }).strict(),
]);

const visibilityError = "Unable to update image visibility. Please try again.";

function canChangeVisibility(asset: CloudinaryAssetRecord) {
  const managed = managedAsset(asset);
  return canToggleManagedRecord(managed);
}

function canToggleManagedRecord(asset: ReturnType<typeof managedAsset>) {
  const uploadStatus = asset.context.upload_request_status;
  return asset.placement !== "library" && (!uploadStatus || uploadStatus === "complete") && canToggleManagedAsset(asset);
}

async function restoreVisibility(asset: CloudinaryAssetRecord) {
  await updateCloudinaryContext(asset, { ...((asset.context?.custom || {}) as Record<string, string>) }, asset.tags || []);
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
    const projectSlug = searchParams.get("project")?.trim().toLowerCase() || "";
    const status = searchParams.get("status") === "active" || searchParams.get("status") === "inactive" ? searchParams.get("status") : "all";
    // This screen is used only by an authenticated administrator. Read the
    // provider's current list so a just-uploaded batch cannot be replaced in
    // the gallery by an older cached set from another server instance.
    const records = (await fetchCloudinaryAssets()).map(managedAsset).filter((asset) =>
      asset.placement !== "replacement-staging" &&
      !asset.publicId.startsWith("atelier-wall-story/replacements/") &&
      isWebsiteImageInUse(asset) &&
      !isDuplicateSourceArtwork(asset.categorySlug, asset.artworkCode),
    ).sort((a, b) => b.id.localeCompare(a.id));
    const taxonomy = buildAdminImageTaxonomy(records);
    const categoryNames = new Map(taxonomy.categories.map((category) => [category.slug, category.name.toLowerCase()]));
    const subcategoryNames = new Map(taxonomy.categories.flatMap((category) => category.subcategories.map((subcategory) => [subcategory.slug, subcategory.name.toLowerCase()] as const)));
    const scoped = records.filter((asset) => {
      if (section && !asset.sectionSlugs.includes(section)) return false;
      if (categorySlug && asset.categorySlug !== categorySlug) return false;
      if (subcategorySlug && asset.subcategorySlug !== subcategorySlug) return false;
      if (projectSlug && asset.projectSlug !== projectSlug) return false;
      if (!query) return true;
      return [asset.altText, asset.originalFilename, asset.publicId, asset.categorySlug, categoryNames.get(asset.categorySlug), asset.artworkCode, asset.subcategoryName, subcategoryNames.get(asset.subcategorySlug), ...asset.sectionSlugs]
        .some((value) => value?.toLowerCase().includes(query));
    });
    const publicStatus = (asset: ReturnType<typeof managedAsset>) => asset.placement === "library" || Boolean(asset.context.upload_request_status && asset.context.upload_request_status !== "complete") ? false : canToggleManagedAsset(asset) ? asset.active : true;
    const counts = {
      all: scoped.length,
      active: scoped.filter((asset) => publicStatus(asset)).length,
      inactive: scoped.filter((asset) => !publicStatus(asset)).length,
    };
    const filtered = status === "all" ? scoped : scoped.filter((asset) => publicStatus(asset) === (status === "active"));
    const pageSize = 24;
    const assets = filtered.slice((page - 1) * pageSize, page * pageSize).map((asset) => ({
      assetKey: adminMediaKey(asset.publicId),
      secureUrl: asset.secureUrl,
      altText: asset.altText,
      displayName: humanizeMediaDisplayName(asset.originalFilename || asset.altText, asset.projectName || "Website image"),
      width: asset.width,
      height: asset.height,
      active: publicStatus(asset),
      canToggle: canToggleManagedRecord(asset),
      canDelete: !asset.references.length && !isFixedWebsiteImage(asset),
    }));
    const clientTaxonomy = {
      sections: taxonomy.sections,
      publicCounts: taxonomy.publicCounts,
      categories: taxonomy.categories.map(({ slug, name, retired, isPublic, imageCount, subcategories }) => ({
        slug, name, retired, isPublic, imageCount,
        subcategories: subcategories.map(({ slug: subSlug, name: subName, imageCount: subCount }) => ({ slug: subSlug, name: subName, imageCount: subCount })),
      })),
      projectGalleries: taxonomy.projectGalleries,
    };
    return NextResponse.json({ ok: true, assets, total: filtered.length, totalManagedImages: records.length, page, pageSize, counts, taxonomy: clientTaxonomy }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Images could not be loaded. Please refresh the page." }, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const parsed = patchSchema.safeParse(await readJsonBody(request, 16384));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Choose an image and try again." }, { status: 400, headers });
    if ("assetKeys" in parsed.data) {
      const snapshots = await Promise.all(parsed.data.assetKeys.map((key) => fetchCloudinaryAssetByKey(key)));
      if (snapshots.some((asset) => !asset)) return NextResponse.json({ ok: false, error: "One or more images could not be found. Refresh the page and try again." }, { status: 404, headers });
      const assets = snapshots.filter((asset): asset is CloudinaryAssetRecord => Boolean(asset));
      if (assets.some((asset) => !canChangeVisibility(asset))) return NextResponse.json({ ok: false, error: "Some selected images cannot be hidden from the website." }, { status: 409, headers });
      const attempted: CloudinaryAssetRecord[] = [];
      try {
        for (const asset of assets) {
          const context = { ...((asset.context?.custom || {}) as Record<string, string>), active: String(parsed.data.active) };
          attempted.push(asset);
          await updateCloudinaryContext(asset, context, asset.tags || []);
        }
      } catch {
        for (const asset of attempted.reverse()) await restoreVisibility(asset).catch(() => undefined);
        invalidateCloudinaryAssetCache();
        return NextResponse.json({ ok: false, error: visibilityError }, { status: 503, headers });
      }
      invalidateCloudinaryAssetCache();
      return NextResponse.json({ ok: true, updated: assets.length }, { headers });
    }
    const asset = await fetchCloudinaryAssetByKey(parsed.data.assetKey);
    if (!asset) return NextResponse.json({ ok: false, error: "This image could not be found. Refresh the page and try again." }, { status: 404, headers });
    if ("categorySlug" in parsed.data) {
      const assignment = parsed.data;
      const current = managedAsset(asset);
      const category = DESIGN_CATEGORY_RECORDS.find((item) => item.slug === assignment.categorySlug.trim().toLowerCase());
      if (!category) return NextResponse.json({ ok: false, error: "Choose a current design category." }, { status: 400, headers });
      const categoryTaxonomy = buildAdminImageTaxonomy([]).categories.find((item) => item.slug === category.slug);
      const requestedSubcategory = assignment.subcategorySlug?.trim().toLowerCase() || "";
      const subcategory = requestedSubcategory ? categoryTaxonomy?.subcategories.find((item) => item.slug === requestedSubcategory) : undefined;
      if (requestedSubcategory && !subcategory) return NextResponse.json({ ok: false, error: "Choose a subcategory in this category." }, { status: 400, headers });
      if (current.placement === "design" && current.categorySlug === category.slug && current.subcategorySlug === (subcategory?.slug || "")) return NextResponse.json({ ok: true, duplicate: true }, { headers });
      const isUnassigned = current.sectionSlugs.includes("library") && !current.categorySlug && !current.projectSlug && !current.references.length;
      if (!isUnassigned) return NextResponse.json({ ok: false, error: "This image already has a website placement and cannot be moved here." }, { status: 409, headers });
      const existing = await getCachedCloudinaryAssets();
      const usedCodes = new Set([
        ...(DRIVE_CATEGORY_ASSETS.find((item) => item.slug === category.slug)?.images.map((image) => image.code) || []),
        ...existing.map((item) => item.context?.custom?.artwork_code || item.public_id.match(/AE\d{2}-\d{2}/i)?.[0] || ""),
      ].map((code) => code.toUpperCase()));
      const artworkCode = nextArtworkCode(category.slotNumber, usedCodes);
      if (!new RegExp(`^AE${String(category.slotNumber).padStart(2, "0")}-\\d{2}$`).test(artworkCode)) return NextResponse.json({ ok: false, error: "This category has reached its image limit." }, { status: 409, headers });
      const staticOrder = DEVELOPMENT_FIXTURE_DESIGNS.filter((design) => design.categorySlug === category.slug).reduce((highest, design) => Math.max(highest, design.sortOrder), 0);
      const managedOrder = existing.filter((item) => item.context?.custom?.placement === "design" && item.context?.custom?.category_slug === category.slug).reduce((highest, item) => Math.max(highest, Number(item.context?.custom?.display_order || 0)), 0);
      const order = Math.min(9999, Math.max(staticOrder, managedOrder) + 1);
      const context = {
        ...((asset.context?.custom || {}) as Record<string, string>),
        alt: current.altText || `Wall art for ${subcategory?.name || category.name}`,
        placement: "design",
        page: "explore-designs",
        section: "catalogue",
        category_slug: category.slug,
        category_name: category.name,
        category_code: category.slotCode,
        artwork_code: artworkCode,
        subcategory_slug: subcategory?.slug || "",
        subcategory_name: subcategory?.name || "",
        display_order: String(order),
        active: "true",
      };
      const tags = ["atelier-site", "explore-designs", "catalogue", category.slug, ...(subcategory ? [subcategory.slug] : []), artworkCode.toLowerCase()];
      await updateCloudinaryContext(asset, context, tags);
      invalidateCloudinaryAssetCache();
      return NextResponse.json({ ok: true }, { headers });
    }
    if (!canChangeVisibility(asset)) return NextResponse.json({ ok: false, error: "This picture is part of a fixed website section. Replace the image to change it." }, { status: 409, headers });
    const context = { ...((asset.context?.custom || {}) as Record<string, string>) };
    context.active = String(parsed.data.active);
    try {
      await updateCloudinaryContext(asset, context, asset.tags || []);
    } catch {
      await restoreVisibility(asset).catch(() => undefined);
      invalidateCloudinaryAssetCache();
      return NextResponse.json({ ok: false, error: visibilityError }, { status: 503, headers });
    }
    invalidateCloudinaryAssetCache();
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to update image visibility. Please try again." }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const keys = [...new Set(new URL(request.url).searchParams.getAll("key").filter(Boolean))];
    if (!keys.length) return NextResponse.json({ ok: false, error: "Choose one or more images." }, { status: 400, headers });
    if (keys.length > 50) return NextResponse.json({ ok: false, error: "Delete up to 50 images at a time." }, { status: 400, headers });
    if (keys.some((key) => !/^[A-Za-z0-9_-]{40,400}$/.test(key))) return NextResponse.json({ ok: false, error: "Refresh the page and choose the images again." }, { status: 400, headers });
    const assets = await Promise.all(keys.map((key) => fetchCloudinaryAssetByKey(key)));
    if (assets.some((asset) => !asset)) return NextResponse.json({ ok: false, error: "One or more images could not be found. Refresh the page and try again." }, { status: 404, headers });
    const protectedAssets = assets.flatMap((asset) => {
      if (!asset) return [];
      const references = mediaReferences(asset.public_id);
      if (references.length || isFixedWebsiteImage(managedAsset(asset))) {
        return [true];
      }
      return [];
    });
    if (protectedAssets.length) return NextResponse.json({ ok: false, error: "This image is used elsewhere on the website and cannot be removed." }, { status: 409, headers });

    let deleted = 0;
    for (const asset of assets) {
      if (!asset) continue;
      try {
        await destroyCloudAsset(asset.public_id);
        deleted += 1;
      } catch {
        invalidateCloudinaryAssetCache();
        return NextResponse.json({ ok: false, deleted, error: "Unable to delete all selected images. Please try again." }, { status: 503, headers });
      }
    }
    invalidateCloudinaryAssetCache();
    return NextResponse.json({ ok: true, deleted }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to delete these images. Please try again." }, { status: 503, headers });
  }
}
