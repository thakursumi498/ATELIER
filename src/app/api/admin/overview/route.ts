import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { queryEnquiries } from "@/lib/enquiries-store";
import { privateJson } from "@/lib/request-security";
import { getCachedCloudinaryAssets, getCachedCloudinaryUsage } from "@/lib/media-store";
import { buildAdminImageTaxonomy } from "@/lib/admin-image-taxonomy";
import { DESIGN_CATEGORY_RECORDS } from "@/lib/designs-catalogue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const [result, imageAssets, cloudinaryUsage] = await Promise.all([
      queryEnquiries({ page: 1, limit: 5 }),
      getCachedCloudinaryAssets().catch(() => null),
      getCachedCloudinaryUsage().catch(() => null),
    ]);
    const statusCounts = new Map(result.metrics.statuses.map(entry => [String(entry._id).toLowerCase(), entry.count]));
    const closed = (statusCounts.get("closed") || 0) + (statusCounts.get("converted") || 0);
    const newCount = (statusCounts.get("new") || 0);
    const taxonomy = buildAdminImageTaxonomy([]);
    const publicCategorySlugs = new Set(DESIGN_CATEGORY_RECORDS.map(category => category.slug));
    const subcategoriesTotal = taxonomy.categories.filter(category => publicCategorySlugs.has(category.slug)).reduce((count, category) => count + category.subcategories.length, 0);
    return privateJson({ ok: true, authenticated: true, database: { connected: true }, counts: { enquiriesTotal: result.total, enquiriesOpen: Math.max(0, result.total - closed), enquiriesNew: newCount, categoriesTotal: DESIGN_CATEGORY_RECORDS.length, subcategoriesTotal, managedImages: imageAssets?.length ?? null, managedImageBytes: imageAssets ? imageAssets.reduce((total, asset) => total + Number(asset.bytes || 0), 0) : null }, cloudinaryUsage, recentEnquiries: result.enquiries });
  } catch {
    return NextResponse.json({ ok: false, error: "Dashboard is unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
