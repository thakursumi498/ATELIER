"use client";

import { useEffect, useState } from "react";
import { AdminConfirmModal, AdminPageHeader, AdminStatusBadge, adminButtonClass, adminCardClass, adminInputClass, adminLabelClass, adminSelectClass } from "@/components/admin/AdminUiPrimitives";
import { Download, Inbox, Mail, MessageCircle, Phone, RefreshCw, Search, Send, Trash2 } from "lucide-react";

const STATUSES = ["New", "Contacted", "Follow-up", "Converted", "Closed"] as const;
type Status = (typeof STATUSES)[number];
type Metrics = {
  statuses: { _id: string; count: number }[];
  services: { _id: string; count: number }[];
  pendingFollowups: number;
};
interface AdminEnquiry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceInterest?: string;
  serviceOrDesignInterest?: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
  sourcePage?: string;
  status: string;
  followUpAt?: string | null;
  selectedDesignReference?: string | null;
  adminNotes?: Array<{ note: string; authorName: string; createdAt: string }>;
}

function normalizeStatus(value: string): Status {
  switch (value.trim().toLowerCase()) {
    case "contacted":
    case "qualified":
    case "in progress": return "Contacted";
    case "follow-up":
    case "follow up": return "Follow-up";
    case "converted": return "Converted";
    case "closed": return "Closed";
    default: return "New";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function localDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function receivedFrom(value: string | undefined) {
  const page = (value || "").split("?")[0].replace(/\/$/, "");
  const labels: Record<string, string> = {
    "": "Website home page",
    "/contact": "Contact page",
    "/explore-designs": "Design catalogue",
    "/projects": "Projects page",
    "/services": "Services page",
    "/visualizer": "Wall Preview",
  };
  return labels[page] || "Website";
}

function LeadCard({
  item,
  nowMs,
  onUpdate,
  onDelete,
  initiallyExpanded,
}: {
  item: AdminEnquiry;
  nowMs: number;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: () => void;
  initiallyExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(localDate(item.followUpAt));
  const [status, setStatus] = useState<Status>(normalizeStatus(item.status));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const digits = item.phone?.replace(/\D/g, "") || "";
  const overdue = Boolean(nowMs > 0 && item.followUpAt && new Date(item.followUpAt).getTime() < nowMs && !["Closed", "Converted"].includes(normalizeStatus(item.status)));
  const service = item.serviceOrDesignInterest || item.serviceInterest || "General enquiry";

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await onUpdate(item.id, patch);
      setNote("");
      setNotice("Enquiry updated.");
    } catch {
      setError("Unable to save this enquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`${adminCardClass} overflow-hidden`}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-[#746B64]">{formatDate(item.createdAt)}</p>
          <h2 className="font-serif text-2xl text-[#1A1A1A]">{item.fullName}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#574F49]">
            <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 break-all"><Mail className="h-3.5 w-3.5 shrink-0" />{item.email}</a>
            {item.phone ? <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{item.phone}</a> : null}
          </div>
          <p className="text-xs text-[#746B64]">Interested in: {service} <span className="px-1">·</span> Received from: {receivedFrom(item.sourcePage)}</p>
          {item.followUpAt ? <p className={`text-xs ${overdue ? "font-semibold text-[#9B1C1C]" : "text-[#746B64]"}`}>{overdue ? "Follow-up is due" : "Follow-up scheduled"}: {formatDate(item.followUpAt)}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <AdminStatusBadge tone={normalizeStatus(item.status)}>{normalizeStatus(item.status)}</AdminStatusBadge>
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className={adminButtonClass("secondary", "sm")}>{expanded ? "Close Details" : "View Details"}</button>
          <button type="button" aria-label={`Delete enquiry from ${item.fullName}`} onClick={onDelete} className="rounded-xl border border-[#DFD0C0] p-2 text-[#9B1C1C] hover:bg-[#FAF6F0]"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {expanded ? <div className="space-y-5 border-t border-[#E8DED3] bg-[#FAF6F0]/70 p-5">
        <div className="rounded-xl border border-[#E8DED3] bg-[#FFFDF9] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#746B64]">Customer Message</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1A1A1A]">{item.message}</p>
          {item.selectedDesignReference ? <p className="mt-3 text-xs text-[#746B64]">Selected design or project: {item.selectedDesignReference}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {item.phone ? <a href={`tel:${item.phone}`} className={adminButtonClass("secondary", "sm")}><Phone className="h-3.5 w-3.5" />Call Customer</a> : null}
            {digits ? <a href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hello ${item.fullName}, thank you for contacting ATELIER.`)}`} target="_blank" rel="noreferrer" className={adminButtonClass("secondary", "sm")}><MessageCircle className="h-3.5 w-3.5" />Send WhatsApp Message</a> : null}
            <a href={`mailto:${item.email}`} className={adminButtonClass("secondary", "sm")}><Mail className="h-3.5 w-3.5" />Send Email</a>
          </div>
          <dl className="mt-4 grid gap-3 border-t border-[#E8DED3] pt-4 text-xs sm:grid-cols-2">
            <div><dt className="text-[#746B64]">Enquiry date and time</dt><dd className="mt-0.5 font-medium">{formatDate(item.createdAt)}</dd></div>
            <div><dt className="text-[#746B64]">Received from</dt><dd className="mt-0.5 font-medium">{receivedFrom(item.sourcePage)}</dd></div>
          </dl>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void save({ status, followUpAt: followUp ? new Date(followUp).toISOString() : null }); }} className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={adminLabelClass}>Current Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={`${adminSelectClass} mt-1.5`}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className={adminLabelClass}>Schedule Follow-up<input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className={`${adminInputClass} mt-1.5`} /></label>
          </div>
          <button disabled={busy} className={adminButtonClass("primary", "sm")}>{busy ? "Saving…" : "Save Changes"}</button>
        </form>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#746B64]">Notes</h3>
          {(item.adminNotes || []).map((entry, index) => <div key={`${entry.createdAt}-${index}`} className="rounded-xl border border-[#E8DED3] bg-[#FFFDF9] p-3 text-xs text-[#574F49]"><p className="mb-1 font-medium text-[#9B1C1C]">{entry.authorName} · {formatDate(entry.createdAt)}</p><p className="whitespace-pre-wrap break-words">{entry.note}</p></div>)}
          <form onSubmit={(event) => { event.preventDefault(); if (note.trim()) void save({ note: note.trim() }); }} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className={`${adminLabelClass} flex-1`}>Add a Note<textarea maxLength={3000} value={note} onChange={(event) => setNote(event.target.value)} rows={2} className={`${adminInputClass} mt-1.5 h-auto py-3`} /></label>
            <button disabled={busy || !note.trim()} className={adminButtonClass("primary", "sm")}><Send className="h-3.5 w-3.5" />Save Note</button>
          </form>
        </div>
        {error ? <p role="alert" className="text-sm text-[#9B1C1C]">{error}</p> : null}
        {notice ? <p role="status" className="text-sm text-[#264E32]">{notice}</p> : null}
      </div> : null}
    </article>
  );
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<AdminEnquiry[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [status, setStatus] = useState("All");
  const [service, setService] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pendingFollowups, setPendingFollowups] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({ statuses: [], services: [], pendingFollowups: 0 });
  const [pendingDelete, setPendingDelete] = useState<AdminEnquiry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [loadedRefreshKey, setLoadedRefreshKey] = useState(-1);

  const params = new URLSearchParams({ search: querySearch, status, service, dateFrom, dateTo, pendingFollowups: String(pendingFollowups), page: String(page) });
  const query = params.toString();
  const loading = loadedQuery !== query || loadedRefreshKey !== refreshKey;

  useEffect(() => { const timer = window.setTimeout(() => { setQuerySearch(search); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [search]);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/enquiries?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
        if (!active) return;
        setEnquiries(data.enquiries);
        setTotal(data.total);
        setPages(data.pages);
        setMetrics(data.metrics);
        setNowMs(Date.now());
        setSelectedId(new URLSearchParams(window.location.search).get("enquiry") || "");
        setError("");
        setLoadedQuery(query);
        setLoadedRefreshKey(refreshKey);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load enquiries. Please refresh the page.");
        setLoadedQuery(query);
        setLoadedRefreshKey(refreshKey);
      });
    return () => { active = false; };
  }, [query, refreshKey]);

  const update = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch("/api/admin/enquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error("Unable to save enquiry.");
    setEnquiries((items) => items.map((item) => item.id === id ? data.enquiry : item));
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/enquiries?id=${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error();
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
    } catch {
      setError("Unable to delete this enquiry. Please try again.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const countStatus = (target: Status) => metrics.statuses.filter((entry) => normalizeStatus(entry._id) === target).reduce((count, entry) => count + entry.count, 0);
  const exportParams = new URLSearchParams(params);
  exportParams.set("format", "csv");

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Customer Management" title="Customer Enquiries" description="Review customer messages, respond directly, and keep follow-ups moving." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Matching enquiries", total], ["New", countStatus("New")], ["Pending follow-ups", metrics.pendingFollowups], ["Converted customers", countStatus("Converted")]].map(([label, value]) => <div key={label} className={`${adminCardClass} p-4`}><p className="text-xs text-[#746B64]">{label}</p><p className="mt-2 font-serif text-3xl tabular-nums text-[#1A1A1A]">{value}</p></div>)}
      </div>

      <section className={`${adminCardClass} space-y-4 p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Search by customer name, email or phone</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#746B64]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" className={`${adminInputClass} pl-10`} /></label>
          <a href={`/api/admin/enquiries?${exportParams.toString()}`} className={adminButtonClass("secondary", "sm")}><Download className="h-4 w-4" />Export Enquiries</a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className={adminLabelClass}>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={`${adminSelectClass} mt-1.5`}><option>All</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className={adminLabelClass}>Interested Service<select value={service} onChange={(event) => { setService(event.target.value); setPage(1); }} className={`${adminSelectClass} mt-1.5`}><option value="">All services</option>{metrics.services.map((entry) => <option key={entry._id} value={entry._id}>{entry._id}</option>)}</select></label>
          <label className={adminLabelClass}>From Date<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className={`${adminInputClass} mt-1.5`} /></label>
          <label className={adminLabelClass}>To Date<input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className={`${adminInputClass} mt-1.5`} /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DED3] pt-3">
          <label className="inline-flex min-h-9 items-center gap-2 text-xs text-[#574F49]"><input type="checkbox" checked={pendingFollowups} onChange={(event) => { setPendingFollowups(event.target.checked); setPage(1); }} />Pending follow-ups only</label>
          <button type="button" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} className={adminButtonClass("secondary", "sm")}><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
        </div>
      </section>

      {error ? <p role="alert" className="rounded-xl border border-[#9B1C1C]/30 p-4 text-sm text-[#9B1C1C]">{error}</p> : null}
      {loading ? <p role="status" className={`${adminCardClass} p-10 text-center text-sm text-[#746B64]`}>Loading enquiries…</p> : !error && enquiries.length === 0 ? <div className={`${adminCardClass} p-12 text-center`}><Inbox className="mx-auto h-8 w-8 text-[#9B1C1C]" /><p className="mt-3 font-serif text-2xl">No matching enquiries</p><p className="mt-2 text-xs text-[#746B64]">Try changing the filters, or check again when a customer contacts your studio.</p></div> : <div className="space-y-4">{enquiries.map((item) => <LeadCard key={item.id} item={item} nowMs={nowMs} onUpdate={update} onDelete={() => setPendingDelete(item)} initiallyExpanded={selectedId === item.id} />)}</div>}
      <div className="flex items-center justify-between gap-3 text-xs text-[#746B64]"><p>Page {page} of {pages} · {total} matching enquiries</p><div className="flex gap-2"><button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className={adminButtonClass("secondary", "sm")}>Previous</button><button disabled={loading || page >= pages} onClick={() => setPage((value) => value + 1)} className={adminButtonClass("secondary", "sm")}>Next</button></div></div>
      <AdminConfirmModal open={Boolean(pendingDelete)} title="Delete enquiry?" description={pendingDelete ? `Permanently delete the enquiry from ${pendingDelete.fullName}, including its notes?` : ""} confirmLabel="Delete enquiry" busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} />
    </div>
  );
}
