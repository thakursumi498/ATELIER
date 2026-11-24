"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  ImagePlus,
  Images,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { adminButtonClass, adminInputClass } from "@/components/admin/AdminUiPrimitives";
import type { AdminImageTaxonomy } from "@/lib/admin-image-taxonomy";

interface AssetReference {
  sourcePath: string;
  page: string;
  section: string;
  categorySlug: string;
  categoryCode: string;
}

interface Asset {
  id: string;
  publicId: string;
  secureUrl: string;
  originalFilename: string;
  altText: string;
  format: string;
  bytes: number;
  originalBytes: number;
  compressionSavedBytes: number;
  width: number;
  height: number;
  categorySlug: string;
  artworkCode: string;
  subcategoryName: string;
  subcategorySlug: string;
  sectionSlugs: string[];
  placement: string;
  displayOrder: number;
  active: boolean;
  context: Record<string, string>;
  references: AssetReference[];
}

interface MediaResponse {
  ok: boolean;
  error?: string;
  assets: Asset[];
  total: number;
  totalManagedImages: number;
  page: number;
  pageSize: number;
  taxonomy: AdminImageTaxonomy;
}

const ALL_SECTIONS = "all";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  return bytes < 1_000_000 ? `${(bytes / 1000).toFixed(0)} KB` : `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function humanizeSection(slug: string, taxonomy: AdminImageTaxonomy | null) {
  return taxonomy?.sections.find((section) => section.slug === slug)?.name || "Other Website Images";
}

export function AdminManageImages() {
  const fileRef = useRef<HTMLInputElement>(null);
  const replacementRef = useRef<HTMLInputElement>(null);
  const replacementTarget = useRef<Asset | null>(null);
  const [taxonomy, setTaxonomy] = useState<AdminImageTaxonomy | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sectionSlug, setSectionSlug] = useState(ALL_SECTIONS);
  const [categorySlug, setCategorySlug] = useState("");
  const [subcategorySlug, setSubcategorySlug] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [managedImageCount, setManagedImageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");

  const categories = taxonomy?.categories || [];
  const selectedCategory = categories.find((category) => category.slug === categorySlug) || null;
  const selectedSubcategory = selectedCategory?.subcategories.find((item) => item.slug === subcategorySlug) || null;
  const editingSelectedCategory = categories.find((category) => category.slug === (editing?.context.category_edit_slug ?? editing?.categorySlug)) || null;
  const visibleCategories = categories.filter((category) =>
    !categorySearch || `${category.name} ${category.slotCode}`.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(nextPage) });
    if (search.trim()) params.set("q", search.trim());
    if (sectionSlug !== ALL_SECTIONS) params.set("section", sectionSlug);
    if (categorySlug) params.set("category", categorySlug);
    if (subcategorySlug) params.set("subcategory", subcategorySlug);
    try {
      const response = await fetch(`/api/admin/media?${params.toString()}`, { cache: "no-store" });
      const json = await response.json() as MediaResponse;
      if (!response.ok || !json.ok) throw new Error(json.error || "Images could not be loaded.");
      setAssets(Array.isArray(json.assets) ? json.assets : []);
      setTotal(Number(json.total) || 0);
      setManagedImageCount(Number(json.totalManagedImages) || 0);
      setTaxonomy(json.taxonomy || null);
      setSelectedIds([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Images could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [categorySlug, page, search, sectionSlug, subcategorySlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(page), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, page, search]);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const pageCount = Math.max(1, Math.ceil(total / (24)));
  const selectedAssets = assets.filter((asset) => selectedIds.includes(asset.id));
  const deletableSelected = selectedAssets.filter((asset) => !asset.references.length && (asset.placement !== "design" || !asset.active));

  function chooseSection(slug: string) {
    setSectionSlug(slug);
    setCategorySlug("");
    setSubcategorySlug("");
    setExpandedCategory("");
    setPage(1);
    setEditing(null);
  }

  function chooseCategory(slug: string) {
    setSectionSlug("explore-designs");
    setCategorySlug(slug);
    setSubcategorySlug("");
    setExpandedCategory(slug);
    setPage(1);
    setEditing(null);
  }

  function chooseSubcategory(slug: string) {
    setSubcategorySlug((current) => current === slug ? "" : slug);
    setPage(1);
  }

  async function patchAsset(asset: Asset, patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, ...patch }),
      });
      const json = await response.json() as { ok?: boolean; error?: string; artworkCode?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "Image changes could not be saved.");
      setNotice(json.artworkCode ? `Image moved to the catalogue as ${json.artworkCode}.` : "Image changes saved.");
      setEditing(null);
      await load(page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(selected: File[], replace?: Asset | null) {
    if (!selected.length) return;
    const tooLarge = selected.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} is over the 5 MB upload limit.`);
      return;
    }
    if (!replace && sectionSlug === "explore-designs" && !categorySlug) {
      setError("Open a design category first so this image gets the right category and subcategory.");
      return;
    }
    if (!replace && selectedCategory?.retired) {
      setError("This collection is retired from the public catalogue. You can review existing images, but cannot add new ones here.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    const savings: number[] = [];
    let completed = 0;
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        setUploadProgress(`Optimizing image ${index + 1} of ${selected.length}…`);
        const form = new FormData();
        form.append("file", file);
        form.append("altText", replace?.altText || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
        form.append("displayOrder", String(Math.max(0, Number(replace?.displayOrder ?? total) || 0) + index));
        if (replace) {
          form.append("replaceId", replace.id);
        } else if (categorySlug) {
          form.append("placement", "design");
          form.append("categorySlug", categorySlug);
          form.append("subcategorySlug", subcategorySlug);
        } else if (sectionSlug !== ALL_SECTIONS && sectionSlug !== "library" && sectionSlug !== "other") {
          form.append("placement", "section-library");
          form.append("page", sectionSlug);
        } else {
          form.append("placement", "library");
        }
        const response = await fetch("/api/admin/upload", { method: "POST", body: form });
        const json = await response.json() as { ok?: boolean; error?: string; compression?: { savedBytes?: number } };
        if (!response.ok || !json.ok) throw new Error(json.error || `Could not upload ${file.name}.`);
        savings.push(Number(json.compression?.savedBytes || 0));
        completed += 1;
      }
      const savedBytes = savings.reduce((sum, value) => sum + value, 0);
      setNotice(`${completed} image${completed === 1 ? "" : "s"} optimized and saved${savedBytes ? ` · ${formatBytes(savedBytes)} saved` : ""}.`);
      setFiles([]);
      setUploadProgress("");
      await load(1);
      setPage(1);
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : "Image upload failed."}${completed ? ` ${completed} image${completed === 1 ? " was" : "s were"} uploaded before the error.` : ""}`);
      setUploadProgress("");
      await load(page);
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function deleteSelected() {
    const safeIds = deletableSelected.map((asset) => asset.id);
    if (!safeIds.length) return;
    if (!window.confirm(`Delete ${safeIds.length} unused image${safeIds.length === 1 ? "" : "s"} from Cloudinary? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams();
      safeIds.forEach((id) => params.append("id", id));
      const response = await fetch(`/api/admin/media?${params.toString()}`, { method: "DELETE" });
      const json = await response.json() as { ok?: boolean; error?: string; deleted?: number };
      if (!response.ok || !json.ok) throw new Error(json.error || "Selected images could not be deleted.");
      setNotice(`${json.deleted || safeIds.length} unused image${safeIds.length === 1 ? "" : "s"} deleted.`);
      setSelectedIds([]);
      await load(page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Selected images could not be deleted.");
      await load(page);
    } finally {
      setBusy(false);
    }
  }

  const currentSectionName = sectionSlug === ALL_SECTIONS ? "All website sections" : humanizeSection(sectionSlug, taxonomy);
  const breadcrumb = [currentSectionName, selectedCategory?.name, selectedSubcategory?.name].filter(Boolean).join(" › ");
  const uploadAllowed = sectionSlug === "explore-designs" && !!selectedCategory && !selectedCategory.retired && (!selectedCategory.subcategories.length || !!selectedSubcategory);
  const libraryUploadAllowed = !uploadAllowed && sectionSlug !== "explore-designs";

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B1C1C]">ATELIER Studio</p><h1 className="mt-1 font-serif text-3xl sm:text-4xl">Manage Images</h1><p className="mt-2 max-w-2xl text-sm text-[#746B64]">Browse website images by page, category and subcategory. New catalogue images inherit the place you opened.</p></div>
      {uploadAllowed ? <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={adminButtonClass("primary")}><ImagePlus className="h-4 w-4"/>Add to {selectedSubcategory?.name || selectedCategory.name}</button> : libraryUploadAllowed ? <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={adminButtonClass("primary")}><ImagePlus className="h-4 w-4"/>Upload image</button> : null}
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Website sections", value: taxonomy?.sections.filter((item) => item.slug !== "library").length ?? "—" },
        { label: "Design categories", value: taxonomy?.categories.length ?? "—" },
        { label: "Subcategories", value: taxonomy?.categories.reduce((count, item) => count + item.subcategories.length, 0) ?? "—" },
        { label: "Managed images", value: managedImageCount.toLocaleString("en-IN") },
      ].map((metric) => <div key={metric.label} className="rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-4"><p className="text-xs text-[#746B64]">{metric.label}</p><p className="mt-2 font-serif text-3xl">{metric.value}</p></div>)}
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-4">
        <label className="relative block"><Search className="absolute left-3 top-3 text-[#746B64]" size={16}/><span className="sr-only">Search categories</span><input className={`${adminInputClass} pl-9`} value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Find a category…"/></label>
        <nav aria-label="Image sections" className="space-y-1">
          <button type="button" onClick={() => chooseSection(ALL_SECTIONS)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === ALL_SECTIONS ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>All website sections</span><span className="text-xs">{managedImageCount}</span></button>
          {taxonomy?.sections.filter((item) => item.slug !== "library").map((section) => <button type="button" key={section.slug} onClick={() => chooseSection(section.slug)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === section.slug && !categorySlug ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>{section.name}</span><span className="text-xs">{section.imageCount}</span></button>)}
          <button type="button" onClick={() => chooseSection("library")} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === "library" ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>Unassigned Uploads</span><span className="text-xs">{taxonomy?.sections.find((item) => item.slug === "library")?.imageCount || 0}</span></button>
        </nav>

        <div className="border-t border-[#E8DED3] pt-4">
          <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#746B64]">Design categories</h2><span className="text-xs text-[#746B64]">{categories.length}</span></div>
          <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
            {visibleCategories.map((category) => {
              const expanded = expandedCategory === category.slug;
              const selected = categorySlug === category.slug && sectionSlug === "explore-designs";
              return <div key={category.slug} className="rounded-xl">
                <div className={`flex items-center rounded-xl ${selected ? "bg-[#9B1C1C]/[0.08]" : "hover:bg-[#FAF6F0]"}`}>
                  <button type="button" onClick={() => chooseCategory(category.slug)} className={`min-w-0 flex-1 px-3 py-2 text-left text-sm ${selected ? "font-semibold text-[#9B1C1C]" : "text-[#574F49]"}`}><span className="mr-1 text-[10px] font-semibold text-[#9B1C1C]">{category.slotCode}</span><span className="break-words">{category.name}</span>{category.retired && <span className="ml-1 block text-[10px] text-[#746B64]">Hidden from public catalogue</span>}</button>
                  <span className="mr-1 text-xs text-[#746B64]">{category.imageCount}</span>
                  <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`} onClick={() => { setExpandedCategory(expanded ? "" : category.slug); setSectionSlug("explore-designs"); setCategorySlug(category.slug); setSubcategorySlug(""); setPage(1); setEditing(null); }} className="rounded-lg p-2 text-[#746B64] hover:text-[#9B1C1C]">{expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button>
                </div>
                {expanded && <div className="ml-3 mt-1 border-l border-[#E8DED3] pl-2">
                  <button type="button" onClick={() => chooseCategory(category.slug)} className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${!subcategorySlug && selected ? "bg-white font-semibold text-[#9B1C1C]" : "text-[#746B64] hover:bg-white"}`}><span>All in {category.name}</span><span>{category.imageCount}</span></button>
                  {category.subcategories.length ? category.subcategories.map((subcategory) => <button type="button" key={subcategory.slug} onClick={() => { chooseCategory(category.slug); setSubcategorySlug(subcategory.slug); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${selected && subcategorySlug === subcategory.slug ? "bg-white font-semibold text-[#9B1C1C]" : "text-[#746B64] hover:bg-white"}`}><span className="truncate">{subcategory.name}</span><span className="ml-2">{subcategory.imageCount}</span></button>) : <p className="px-2.5 py-2 text-xs text-[#928980]">No subcategories configured</p>}
                </div>}
              </div>;
            })}
            {!visibleCategories.length && <p className="px-3 py-5 text-center text-xs text-[#746B64]">No categories match that search.</p>}
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B1C1C]">{breadcrumb}</p><h2 className="mt-1 font-serif text-2xl">{selectedSubcategory?.name || selectedCategory?.name || currentSectionName}</h2></div>
            <label className="relative min-w-[220px] flex-1 sm:max-w-sm"><Search className="absolute left-3 top-3 text-[#746B64]" size={16}/><span className="sr-only">Search images</span><input className={`${adminInputClass} pl-9`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search images or artwork code…"/></label>
          </div>
          {categorySlug && selectedCategory && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E8DED3] pt-3"><span className="mr-1 text-xs text-[#746B64]">Subcategories</span><button type="button" onClick={() => chooseSubcategory("")} className={`rounded-full px-3 py-1.5 text-xs ${!subcategorySlug ? "bg-[#9B1C1C] text-white" : "border border-[#DFD0C0] text-[#574F49]"}`}>All · {selectedCategory.imageCount}</button>{selectedCategory.subcategories.map((subcategory) => <button type="button" key={subcategory.slug} onClick={() => chooseSubcategory(subcategory.slug)} className={`rounded-full px-3 py-1.5 text-xs ${subcategorySlug === subcategory.slug ? "bg-[#9B1C1C] text-white" : "border border-[#DFD0C0] text-[#574F49]"}`}>{subcategory.name} · {subcategory.imageCount}</button>)}{!selectedCategory.subcategories.length && <p className="text-xs text-[#928980]">This category has no configured subcategories yet. New images can be assigned directly to the category.</p>}</div>}
          {categorySlug && selectedCategory?.subcategories.length && !subcategorySlug && !selectedCategory.retired && <p className="mt-3 text-xs text-[#746B64]">Choose a subcategory above to add images there.</p>}
          {sectionSlug !== ALL_SECTIONS && sectionSlug !== "explore-designs" && <p className="mt-3 border-t border-[#E8DED3] pt-3 text-xs leading-relaxed text-[#746B64]">Replace an existing image to update that website position immediately. New uploads from other sections are kept in Unassigned Uploads until used.</p>}
          {(uploadAllowed || libraryUploadAllowed) && <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = Array.from(event.dataTransfer.files); setFiles(dropped.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type))); }} className="mt-4 rounded-xl border border-dashed border-[#DFD0C0] bg-[#FAF6F0]/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">{uploadAllowed ? `Add to ${selectedCategory?.name}${selectedSubcategory ? ` · ${selectedSubcategory.name}` : ""}` : sectionSlug === ALL_SECTIONS || sectionSlug === "library" ? "Upload to Unassigned Uploads" : `Upload for ${currentSectionName}`}</p><p className="mt-1 text-xs text-[#746B64]">JPG, PNG or WebP · up to 5 MB each · optimized automatically before upload</p></div><button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={adminButtonClass("secondary", "sm")}><Upload size={15}/>Choose images</button></div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { setFiles(Array.from(event.target.files || [])); event.target.value = ""; }}/>
            {previews.length > 0 && <div className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{previews.map(({ file, url }) => <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-[#E8DED3] bg-white p-2"><img src={url} alt={`Preview of ${file.name}`} className="h-14 w-16 rounded-lg bg-[#FAF6F0] object-contain"/><div className="min-w-0"><p className="truncate text-xs font-medium">{file.name}</p><p className="text-[11px] text-[#746B64]">Original · {formatBytes(file.size)}</p></div></div>)}</div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#746B64]">{uploadProgress || `${files.length} selected. The server compresses each image before upload.`}</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setFiles([])} className={adminButtonClass("secondary", "sm")}>Clear</button><button type="button" disabled={busy} onClick={() => void uploadFiles(files)} className={adminButtonClass("primary", "sm")}><Upload size={14}/>{busy ? "Uploading…" : "Upload selected"}</button></div></div></div>}
          </div>}
          <input ref={replacementRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file && replacementTarget.current) void uploadFiles([file], replacementTarget.current); event.target.value = ""; }}/>
          {error && <p role="alert" className="mt-4 rounded-lg bg-[#FCEEEE] p-3 text-sm text-[#9B1C1C]">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg bg-[#EDF5EE] p-3 text-sm text-[#264E32]">{notice}</p>}
          {selectedIds.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F4EEE7] p-3"><p className="text-sm">{selectedIds.length} selected{deletableSelected.length < selectedIds.length ? ` · ${selectedIds.length - deletableSelected.length} used images protected` : ""}</p><button type="button" disabled={busy || !deletableSelected.length} onClick={() => void deleteSelected()} className={adminButtonClass("secondary", "sm")}><Trash2 size={14}/>Delete unused selected</button></div>}
        </div>

        {loading ? <div role="status" className="rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-12 text-center text-sm text-[#746B64]">Loading image inventory…</div> : assets.length === 0 ? <div className="rounded-2xl border border-dashed border-[#DFD0C0] bg-[#FFFDF9] p-10 text-center"><Images className="mx-auto mb-3 text-[#9B1C1C]"/><p className="font-medium">No images here yet</p><p className="mt-1 text-sm text-[#746B64]">This category stays visible so you can add images whenever they are ready.</p>{uploadAllowed && <button type="button" onClick={() => fileRef.current?.click()} className={`${adminButtonClass("primary", "sm")} mt-4`}><ImagePlus size={14}/>Add an image</button>}</div> : <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1"><label className="inline-flex items-center gap-2 text-xs text-[#746B64]"><input type="checkbox" checked={assets.length > 0 && assets.every((asset) => selectedIds.includes(asset.id))} onChange={(event) => setSelectedIds(event.target.checked ? assets.map((asset) => asset.id) : [])}/>Select this page</label><p className="text-xs text-[#746B64]">{total} image{total === 1 ? "" : "s"} in this view</p></div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{assets.map((asset) => {
            const category = categories.find((item) => item.slug === asset.categorySlug);
            const canToggle = !!asset.categorySlug || !asset.references.length;
            const canDelete = !asset.references.length && (asset.placement !== "design" || !asset.active);
            return <article key={asset.id} className="overflow-hidden rounded-2xl border border-[#E8DED3] bg-[#FFFDF9]">
              <div className="relative"><a href={asset.secureUrl} target="_blank" rel="noreferrer" aria-label={`Preview ${asset.originalFilename}`}><img src={asset.secureUrl} alt={asset.altText} loading="lazy" width={asset.width || undefined} height={asset.height || undefined} className="aspect-[4/3] w-full bg-[#EDE4DA] object-contain"/></a><label className="absolute left-3 top-3 rounded-lg bg-white/95 p-2 shadow-sm"><span className="sr-only">Select {asset.originalFilename}</span><input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={() => toggleSelected(asset.id)}/></label><span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium ${asset.active ? "bg-[#EAF4EC] text-[#315B3B]" : "bg-[#F1ECE7] text-[#746B64]"}`}>{asset.active ? "Active" : "Inactive"}</span></div>
              <div className="space-y-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold" title={asset.originalFilename}>{asset.originalFilename}</p><p className="mt-1 text-xs text-[#746B64]">{category ? `${category.name}${asset.subcategoryName ? ` · ${asset.subcategoryName}` : ""}` : asset.sectionSlugs.map((slug) => humanizeSection(slug, taxonomy)).join(" · ")}</p>{asset.artworkCode && <p className="mt-1 text-xs font-medium text-[#9B1C1C]">{asset.artworkCode}</p>}</div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[#E8DED3] pt-3 text-[11px]"><div><dt className="text-[#928980]">Original size</dt><dd className="font-medium">{formatBytes(asset.originalBytes)}</dd></div><div><dt className="text-[#928980]">Compressed size</dt><dd className="font-medium">{formatBytes(asset.bytes)}</dd></div><div><dt className="text-[#928980]">Compression saved</dt><dd className="font-medium">{formatBytes(asset.compressionSavedBytes)}</dd></div><div><dt className="text-[#928980]">Dimensions</dt><dd className="font-medium">{asset.width} × {asset.height}px</dd></div><div><dt className="text-[#928980]">Format</dt><dd className="font-medium uppercase">{asset.format}</dd></div><div><dt className="text-[#928980]">Display order</dt><dd className="font-medium">{asset.displayOrder}</dd></div></dl>
                {asset.references.length > 0 && <p className="text-[11px] leading-relaxed text-[#746B64]">Used in {asset.references.length} website location{asset.references.length === 1 ? "" : "s"}: {asset.references.map((reference) => humanizeSection(reference.page, taxonomy)).filter((name, index, names) => names.indexOf(name) === index).join(", ")}</p>}
                {editing?.id === asset.id ? <div className="space-y-2 rounded-xl bg-[#FAF6F0] p-3">
                  <label className="block text-[11px] text-[#746B64]">Image name<input className={`${adminInputClass} mt-1`} value={editing.altText} maxLength={500} onChange={(event) => setEditing({ ...editing, altText: event.target.value })}/></label>
                  <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-[#746B64]">Category<select className={`${adminInputClass} mt-1`} value={editing.context.category_edit_slug ?? editing.categorySlug} onChange={(event) => { setEditing({ ...editing, context: { ...editing.context, category_edit_slug: event.target.value }, subcategorySlug: "", subcategoryName: "", categorySlug: event.target.value }); }}><option value="" disabled={Boolean(asset.categorySlug)}>Website image / no catalogue category</option>{categories.map((item) => <option key={item.slug} value={item.slug} disabled={item.retired}>{item.name}{item.retired ? " · retired" : ""}</option>)}</select></label><label className="text-[11px] text-[#746B64]">Subcategory<select className={`${adminInputClass} mt-1`} value={editing.subcategorySlug} onChange={(event) => { const sub = editingSelectedCategory?.subcategories.find((item) => item.slug === event.target.value); setEditing({ ...editing, subcategorySlug: event.target.value, subcategoryName: sub?.name || "" }); }} disabled={!editingSelectedCategory?.subcategories.length}><option value="">{editingSelectedCategory?.subcategories.length ? "Choose subcategory" : "No subcategory"}</option>{editingSelectedCategory?.subcategories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-[#746B64]">Display order<input className={`${adminInputClass} mt-1`} type="number" min={0} max={9999} value={editing.displayOrder} onChange={(event) => setEditing({ ...editing, displayOrder: Number(event.target.value) })} disabled={!editing.categorySlug && !!asset.references.length}/></label><label className="flex items-end gap-2 pb-2 text-xs text-[#574F49]"><input type="checkbox" checked={editing.active} disabled={!canToggle} onChange={(event) => setEditing({ ...editing, active: event.target.checked })}/>Active on catalogue</label></div>
                  {!canToggle && <p className="text-[10px] text-[#746B64]">This image fills a fixed website position. Use Replace to change the displayed photo.</p>}
                  <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setEditing(null)} className={adminButtonClass("secondary", "sm")}>Cancel</button><button type="button" disabled={busy} onClick={() => { const originalSlug = asset.categorySlug; const nextSlug = editing.categorySlug; const changedCategory = nextSlug !== originalSlug; const patch: Record<string, unknown> = { altText: editing.altText, active: editing.active }; if (editing.categorySlug) { patch.displayOrder = editing.displayOrder; if (changedCategory || editing.subcategorySlug !== asset.subcategorySlug) { patch.categorySlug = editing.categorySlug; patch.subcategorySlug = editing.subcategorySlug; } } else if (!asset.references.length) patch.displayOrder = editing.displayOrder; void patchAsset(asset, patch); }} className={adminButtonClass("primary", "sm")}><Check size={14}/>Save</button></div>
                </div> : <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.open(asset.secureUrl, "_blank", "noopener,noreferrer")} className={adminButtonClass("secondary", "sm")}><Eye size={13}/>Preview</button><button type="button" disabled={busy} onClick={() => { replacementTarget.current = asset; replacementRef.current?.click(); }} className={adminButtonClass("secondary", "sm")}><Upload size={13}/>Replace</button><button type="button" onClick={() => setEditing({ ...asset, context: { ...asset.context } })} className={adminButtonClass("secondary", "sm")}>Move / details</button><button type="button" disabled={!canDelete || busy} title={!canDelete ? "Images currently used by the website are protected." : "Delete unused image"} onClick={async () => { if (!window.confirm(`Permanently delete ${asset.originalFilename} from Cloudinary?`)) return; const params = new URLSearchParams({ id: asset.id }); const response = await fetch(`/api/admin/media?${params}`, { method: "DELETE" }); const json = await response.json() as { ok?: boolean; error?: string }; if (!response.ok || !json.ok) setError(json.error || "Image could not be deleted."); else { setNotice("Unused image deleted."); await load(page); } }} className={adminButtonClass("secondary", "sm")}><Trash2 size={13}/>Delete</button></div>}
              </div>
            </article>;
          })}</div>
          <div className="flex items-center justify-between rounded-xl border border-[#E8DED3] bg-[#FFFDF9] px-4 py-3 text-xs text-[#746B64]"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className={adminButtonClass("secondary", "sm")}>Previous</button><button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className={adminButtonClass("secondary", "sm")}>Next</button></div></div>
        </div>}
      </section>
    </div>
  </div>;
}
