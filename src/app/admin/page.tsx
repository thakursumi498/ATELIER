"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Images, MessageSquare, UsersRound } from "lucide-react";
import { adminButtonClass, adminCardClass, AdminStatusBadge } from "@/components/admin/AdminUiPrimitives";

interface DashboardEnquiry {
  id: string;
  fullName: string;
  serviceOrDesignInterest?: string;
  serviceInterest?: string;
  createdAt: string;
  status: string;
}

interface DashboardData {
  counts: {
    enquiriesNew: number;
    enquiriesTotal: number;
    websiteImages: number | null;
    designCategories: number;
    subcategories: number;
    pendingFollowups: number;
    convertedCustomers: number;
  };
  recentEnquiries: DashboardEnquiry[];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function displayStatus(status: string): "New" | "Contacted" | "Follow-up" | "Converted" | "Closed" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "qualified" || normalized === "in progress") return "Contacted";
  if (normalized === "follow-up" || normalized === "follow up") return "Follow-up";
  if (normalized === "converted") return "Converted";
  if (normalized === "closed") return "Closed";
  return "New";
}

export default function AdminDashboardOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Your dashboard could not be loaded. Please refresh the page.");
        if (active) setData(result);
      })
      .catch(() => { if (active) setError("Your dashboard could not be loaded. Please refresh the page."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const counts = data?.counts;
  const metrics = [
    { label: "New Enquiries", value: counts?.enquiriesNew, href: "/admin/enquiries?status=New", Icon: MessageSquare },
    { label: "Total Enquiries", value: counts?.enquiriesTotal, href: "/admin/enquiries", Icon: MessageSquare },
    { label: "Website Images", value: counts?.websiteImages, href: "/admin/images", Icon: Images },
    { label: "Design Categories", value: counts?.designCategories, href: "/admin/images", Icon: Images },
    { label: "Subcategories", value: counts?.subcategories, href: "/admin/images", Icon: Images },
    { label: "Pending Follow-ups", value: counts?.pendingFollowups, href: "/admin/enquiries?pendingFollowups=true", Icon: MessageSquare },
    { label: "Converted Customers", value: counts?.convertedCustomers, href: "/admin/enquiries?status=Converted", Icon: UsersRound },
  ];

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-xl border border-[#9B1C1C]/30 bg-[#FFFDF9] p-4 text-sm text-[#9B1C1C]">{error}</p> : null}

      <section className={`${adminCardClass} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8DED3] pb-5">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B1C1C]">ATELIER — WALL STORY</p>
            <h2 className="mt-1 font-serif text-3xl font-normal sm:text-[34px]">Welcome to your studio</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#746B64]">A clear view of your website images and customer enquiries.</p>
          </div>
          <Link href="/" target="_blank" rel="noopener noreferrer" className={adminButtonClass("secondary", "sm")}><ExternalLink className="h-4 w-4" />View Website</Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, href, Icon }) => (
            <Link key={label} href={href} className="rounded-2xl border border-[#E8DED3] bg-[#FAF6F0]/75 p-4 transition-colors hover:border-[#9B1C1C]/45 hover:bg-[#FFFDF9]">
              <div className="flex items-center justify-between gap-2 text-xs text-[#746B64]"><span>{label}</span><Icon className="h-4 w-4 shrink-0 text-[#9B1C1C]" /></div>
              <p className="mt-2.5 font-serif text-3xl tabular-nums">{value === null || value === undefined ? (loading ? "…" : "—") : value.toLocaleString("en-IN")}</p>
            </Link>
          ))}
        </div>

        {data && counts?.websiteImages === null ? <p className="mt-3 text-xs text-[#746B64]">Image total is temporarily unavailable. Refresh the page to try again.</p> : null}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/admin/images" className={adminButtonClass("primary", "sm")}><Images className="h-4 w-4" />Manage Images<ArrowRight className="h-4 w-4" /></Link>
          <Link href="/admin/enquiries" className={adminButtonClass("secondary", "sm")}><MessageSquare className="h-4 w-4" />View Enquiries</Link>
          <Link href="/" target="_blank" rel="noopener noreferrer" className={adminButtonClass("secondary", "sm")}><ExternalLink className="h-4 w-4" />View Website</Link>
        </div>
      </section>

      <section className={`${adminCardClass} p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#E8DED3] pb-4">
          <div><h2 className="font-serif text-2xl">Latest Customer Enquiries</h2><p className="mt-1 text-xs text-[#746B64]">The most recent messages sent through your website.</p></div>
          <Link href="/admin/enquiries" className="shrink-0 text-sm font-medium text-[#9B1C1C] hover:underline">View all</Link>
        </div>
        {!data?.recentEnquiries.length ? (
          <p className="py-8 text-center text-sm text-[#746B64]">{loading ? "Loading enquiries…" : "No customer enquiries yet."}</p>
        ) : (
          <ul className="divide-y divide-[#E8DED3]">
            {data.recentEnquiries.map((enquiry) => {
              const status = displayStatus(enquiry.status);
              return (
                <li key={enquiry.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#1A1A1A]">{enquiry.fullName}</p>
                    <p className="mt-0.5 truncate text-xs text-[#746B64]">{enquiry.serviceOrDesignInterest || enquiry.serviceInterest || "General enquiry"} · {formatDate(enquiry.createdAt)}</p>
                  </div>
                  <AdminStatusBadge tone={status}>{status}</AdminStatusBadge>
                  <Link href={`/admin/enquiries?enquiry=${encodeURIComponent(enquiry.id)}`} className="text-xs font-medium text-[#9B1C1C] hover:underline">View Details</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
