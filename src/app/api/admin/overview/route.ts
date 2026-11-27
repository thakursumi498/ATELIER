import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { queryEnquiries } from "@/lib/enquiries-store";
import { privateJson } from "@/lib/request-security";
import { getCachedCloudinaryAssets } from "@/lib/media-store";
import { buildAdminImageTaxonomy } from "@/lib/admin-image-taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const [result, imageAssets] = await Promise.all([
      queryEnquiries({ page: 1, limit: 5 }),
      getCachedCloudinaryAssets().catch(() => null),
    ]);
    const statusCounts = new Map(result.metrics.statuses.map((entry) => [String(entry._id).toLowerCase(), entry.count]));
    const enquiriesNew = (statusCounts.get("new") || 0);
    const convertedCustomers = statusCounts.get("converted") || 0;
    const taxonomy = buildAdminImageTaxonomy([]);
    return privateJson({
      ok: true,
      authenticated: true,
      counts: {
        enquiriesNew,
        enquiriesTotal: result.total,
        websiteImages: imageAssets?.length ?? null,
        designCategories: taxonomy.publicCounts.designCategories,
        subcategories: taxonomy.publicCounts.subcategories,
        pendingFollowups: result.metrics.pendingFollowups,
        convertedCustomers,
      },
      recentEnquiries: result.enquiries.map((enquiry) => ({
        id: enquiry.id,
        fullName: enquiry.fullName,
        serviceOrDesignInterest: enquiry.serviceOrDesignInterest,
        serviceInterest: enquiry.serviceInterest,
        createdAt: enquiry.createdAt,
        status: enquiry.status,
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Your dashboard could not be loaded. Please refresh the page." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
