"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminAuthBanner } from "@/components/admin/AdminChromeClient";
import { adminButtonClass, adminCardClass, AdminStatusBadge } from "@/components/admin/AdminUiPrimitives";
import type { StoredEnquiryRecord } from "@/lib/enquiries-store";
import { ArrowRight, ExternalLink, Images, MessageSquare } from "lucide-react";

interface DashboardData {
  authenticated: boolean;
  database?: { connected: boolean };
  counts: { enquiriesTotal: number; enquiriesOpen: number; enquiriesNew: number; categoriesTotal: number; subcategoriesTotal: number; managedImages: number | null; managedImageBytes?: number | null };
  cloudinaryUsage?: { creditsUsed: number; creditsLimit: number; creditsUsedPercent: number; updatedAt: string } | null;
  recentEnquiries: StoredEnquiryRecord[];
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMegabytes(bytes: number | null | undefined) {
  return typeof bytes === "number" ? `${(bytes / 1_000_000).toFixed(1)} MB` : "Unavailable";
}

export default function AdminDashboardOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Dashboard is unavailable.");
        if (active) setData(result);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Dashboard is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="space-y-6">
    {data && <AdminAuthBanner authenticated={data.authenticated} />}
    {error && <p role="alert" className="rounded-xl border border-[#9B1C1C]/30 bg-[#FFFDF9] p-4 text-sm text-[#9B1C1C]">{error}</p>}
    <section className={`${adminCardClass} p-6 sm:p-8`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B1C1C]">ATELIER Studio</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-5 border-b border-[#E8DED3] pb-6">
        <div><h1 className="font-serif text-3xl sm:text-4xl">Studio Dashboard</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#746B64]">Website copy and catalogue details are maintained in the frontend. This workspace is for website images and customer enquiries.</p></div>
        <Link href="/" target="_blank" rel="noopener noreferrer" className={adminButtonClass("secondary")}><span>View Website</span><ExternalLink className="h-4 w-4" /></Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "New Enquiries", value: data ? String(data.counts.enquiriesNew) : loading ? "…" : "—", href: "/admin/enquiries", Icon: MessageSquare },
          { label: "Total Enquiries", value: data ? String(data.counts.enquiriesTotal) : loading ? "…" : "—", href: "/admin/enquiries", Icon: MessageSquare },
          { label: "Design Categories", value: data ? String(data.counts.categoriesTotal) : loading ? "…" : "—", href: "/admin/images", Icon: Images },
          { label: "Subcategories", value: data ? String(data.counts.subcategoriesTotal) : loading ? "…" : "—", href: "/admin/images", Icon: Images },
          { label: "Managed Images", value: data ? String(data.counts.managedImages ?? "Unavailable") : loading ? "…" : "—", href: "/admin/images", Icon: Images },
          { label: "Cloudinary Image Storage", value: data ? formatMegabytes(data.counts.managedImageBytes) : loading ? "…" : "—", href: "/admin/images", Icon: Images },
        ].map(metric => <Link key={metric.label} href={metric.href} className="rounded-2xl border border-[#E8DED3] bg-[#FAF6F0]/75 p-4 transition-colors hover:border-[#9B1C1C]/45 hover:bg-[#FFFDF9]"><div className="flex items-center justify-between gap-2 text-xs text-[#746B64]"><span>{metric.label}</span><metric.Icon className="h-4 w-4 shrink-0 text-[#9B1C1C]" /></div><p className="mt-3 font-serif text-3xl">{metric.value}</p></Link>)}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/images" className={adminButtonClass("primary")}><Images className="h-4 w-4" />Manage Images<ArrowRight className="h-4 w-4" /></Link>
        <Link href="/admin/enquiries" className={adminButtonClass("secondary")}><MessageSquare className="h-4 w-4" />Open Enquiries</Link>
      </div>
      <div className="mt-6 grid gap-3 border-t border-[#E8DED3] pt-5 sm:grid-cols-3">
        <div className="rounded-xl bg-[#FAF6F0] p-4"><p className="text-xs text-[#746B64]">Database</p><p className="mt-1 text-sm font-medium">{data?.database?.connected ? "MongoDB Atlas · Connected" : loading ? "Checking…" : "Unavailable"}</p></div>
        <div className="rounded-xl bg-[#FAF6F0] p-4"><p className="text-xs text-[#746B64]">Managed image storage</p><p className="mt-1 text-sm font-medium">{formatMegabytes(data?.counts.managedImageBytes)}</p></div>
        <div className="rounded-xl bg-[#FAF6F0] p-4"><p className="text-xs text-[#746B64]">Cloudinary Free credits</p><p className="mt-1 text-sm font-medium">{data?.cloudinaryUsage ? `${data.cloudinaryUsage.creditsUsed.toFixed(2)} / ${data.cloudinaryUsage.creditsLimit.toFixed(2)} · ${data.cloudinaryUsage.creditsUsedPercent.toFixed(1)}%` : loading ? "Checking…" : "Unavailable"}</p><p className="mt-1 text-[11px] text-[#746B64]">{data?.cloudinaryUsage ? `Usage checked ${formatDate(data.cloudinaryUsage.updatedAt)}` : "Usage data could not be retrieved."}</p></div>
      </div>
    </section>
    <section className={`${adminCardClass} p-6`}>
      <div className="flex items-center justify-between gap-3 border-b border-[#E8DED3] pb-4"><div><h2 className="font-serif text-2xl">Recent Enquiries</h2><p className="mt-1 text-xs text-[#746B64]">Latest submissions from the website.</p></div><Link href="/admin/enquiries" className="text-sm text-[#9B1C1C] hover:underline">View all →</Link></div>
      {!data?.recentEnquiries.length ? <p className="py-8 text-center text-sm text-[#746B64]">{loading ? "Loading enquiries…" : "No enquiries recorded yet."}</p> : <ul className="divide-y divide-[#E8DED3]">{data.recentEnquiries.map(enquiry => <li key={enquiry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{enquiry.fullName}</p><p className="truncate text-xs text-[#746B64]">{enquiry.serviceOrDesignInterest || enquiry.serviceInterest || "General enquiry"} · {formatDate(enquiry.createdAt)}</p></div><AdminStatusBadge tone={enquiry.status === "new" ? "New" : enquiry.status}>{enquiry.status === "new" ? "New" : enquiry.status}</AdminStatusBadge></li>)}</ul>}
    </section>
  </div>;
}
