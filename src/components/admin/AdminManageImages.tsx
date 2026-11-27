"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Images,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { adminButtonClass, adminInputClass, AdminConfirmModal } from "@/components/admin/AdminUiPrimitives";
import type { AdminImageTaxonomy } from "@/lib/admin-image-taxonomy";
import { refreshManagedCatalogueImages } from "@/lib/catalogue-images-client";

interface Asset {
  assetKey: string;
  secureUrl: string;
  altText: string;
  displayName: string;
  width: number;
  height: number;
  active: boolean;
  canToggle: boolean;
  canDelete: boolean;
}

interface MediaResponse {
  ok: boolean;
  error?: string;
  assets: Asset[];
  total: number;
  totalManagedImages: number;
  page: number;
  pageSize: number;
  counts: { all: number; active: number; inactive: number };
  taxonomy: AdminImageTaxonomy;
}

type VisibilityFilter = "all" | "active" | "inactive";

type UploadDestination =
  | { kind: "design"; categorySlug: string; subcategorySlug: string; label: string }
  | { kind: "project-gallery"; projectSlug: string; label: string };

interface UploadQueueItem {
  id: string;
  batchId: string;
  idempotencyKey: string;
  file: File;
  previewUrl: string;
  destination: UploadDestination | null;
  replaceAsset: Asset | null;
  status: "pending" | "uploading" | "success" | "failed";
  error: string;
  retryable: boolean;
}

const ALL_SECTIONS = "all";
const PAGE_SIZE = 24;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 50_000_000;
const MAX_IMAGE_EDGE = 2400;

async function prepareUploadFile(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file;
  if (file.size > MAX_SOURCE_BYTES) throw new Error("This image is larger than 25 MB.");

  let bitmap: ImageBitmap | null = null;
  const canvas = document.createElement("canvas");
  try {
    bitmap = await createImageBitmap(file);
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      throw new Error("This image is too large to prepare. Choose a smaller image.");
    }
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("This image could not be prepared. Please try again.");

    for (const edge of [MAX_IMAGE_EDGE, 2000, 1600]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.82, 0.74, 0.66]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        if (blob && blob.size <= MAX_BYTES) {
          return new File([blob], file.name, { type: "image/webp", lastModified: file.lastModified });
        }
      }
    }
    throw new Error("This image could not be reduced enough to upload. Choose a smaller image.");
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("This image ") || error.message.startsWith("Choose a valid "))) throw error;
    throw new Error("This image could not be prepared. Please try again.");
  } finally {
    bitmap?.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function humanizeSection(slug: string, taxonomy: AdminImageTaxonomy | null) {
  if (slug === "library") return "Needs a home";
  if (slug === "other") return "Other website images";
  return taxonomy?.sections.find((section) => section.slug === slug)?.name || "Website images";
}

function readableFileName(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "New image";
}

export function AdminManageImages() {
  const fileRef = useRef<HTMLInputElement>(null);
  const replacementRef = useRef<HTMLInputElement>(null);
  const replacementTarget = useRef<Asset | null>(null);
  const selectionDestination = useRef<UploadDestination | null>(null);
  const uploadLock = useRef(false);
  const previewUrls = useRef(new Set<string>());
  const [taxonomy, setTaxonomy] = useState<AdminImageTaxonomy | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sectionSlug, setSectionSlug] = useState(ALL_SECTIONS);
  const [categorySlug, setCategorySlug] = useState("");
  const [subcategorySlug, setSubcategorySlug] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [previewing, setPreviewing] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
  const [deleteSelected, setDeleteSelected] = useState(false);
  const [assignmentAsset, setAssignmentAsset] = useState<Asset | null>(null);
  const [assignmentCategory, setAssignmentCategory] = useState("");
  const [assignmentSubcategory, setAssignmentSubcategory] = useState("");

  const categories = taxonomy?.categories || [];
  const projects = taxonomy?.projectGalleries || [];
  const selectedCategory = categories.find((category) => category.slug === categorySlug) || null;
  const selectedSubcategory = selectedCategory?.subcategories.find((item) => item.slug === subcategorySlug) || null;
  const selectedProject = projects.find((project) => project.slug === projectSlug) || null;
  const assignmentCategoryRecord = categories.find((category) => category.slug === assignmentCategory) || null;

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    setSelectedKeys(new Set());
    const params = new URLSearchParams({ page: String(nextPage), status: visibilityFilter });
    if (sectionSlug !== ALL_SECTIONS) params.set("section", sectionSlug);
    if (categorySlug) params.set("category", categorySlug);
    if (subcategorySlug) params.set("subcategory", subcategorySlug);
    if (projectSlug) params.set("project", projectSlug);
    try {
      const response = await fetch(`/api/admin/media?${params.toString()}`, { cache: "no-store" });
      const json = await response.json() as MediaResponse;
      if (!response.ok || !json.ok) throw new Error();
      setAssets(Array.isArray(json.assets) ? json.assets : []);
      setTotal(Number(json.total) || 0);
      setCounts(json.counts || { all: Number(json.total) || 0, active: 0, inactive: 0 });
      setTaxonomy(json.taxonomy || null);
    } catch {
      setError("Images could not be loaded. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [categorySlug, page, projectSlug, sectionSlug, subcategorySlug, visibilityFilter]);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(page), 0);
    return () => window.clearTimeout(timer);
  }, [load, page]);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedAssets = assets.filter((asset) => selectedKeys.has(asset.assetKey));
  const selectedToggleable = selectedAssets.filter((asset) => asset.canToggle);
  const selectedDeletable = selectedAssets.filter((asset) => asset.canDelete);
  const selectableAssets = assets.filter((asset) => asset.canToggle || asset.canDelete);
  const unassignedCount = taxonomy?.sections.find((section) => section.slug === "library")?.imageCount || 0;
  const otherCount = taxonomy?.sections.find((section) => section.slug === "other")?.imageCount || 0;
  const uploadDestination = useMemo<UploadDestination | null>(() => {
    if (sectionSlug === "explore-designs" && selectedCategory && !selectedCategory.retired) {
      return {
        kind: "design",
        categorySlug: selectedCategory.slug,
        subcategorySlug: selectedSubcategory?.slug || "",
        label: ["Explore Designs", selectedCategory.name, selectedSubcategory?.name].filter(Boolean).join(" › "),
      };
    }
    if (sectionSlug === "projects" && selectedProject) {
      return { kind: "project-gallery", projectSlug: selectedProject.slug, label: `Our Projects › ${selectedProject.name}` };
    }
    return null;
  }, [sectionSlug, selectedCategory, selectedProject, selectedSubcategory]);

  function chooseSection(slug: string) {
    setSectionSlug(slug);
    setCategorySlug("");
    setSubcategorySlug("");
    setProjectSlug("");
    setExpandedCategory("");
    setPage(1);
  }

  function chooseCategory(slug: string) {
    setSectionSlug("explore-designs");
    setCategorySlug(slug);
    setSubcategorySlug("");
    setProjectSlug("");
    setExpandedCategory(slug);
    setPage(1);
  }

  function chooseSubcategory(categorySlugValue: string, slug: string) {
    setSectionSlug("explore-designs");
    setCategorySlug(categorySlugValue);
    setSubcategorySlug(slug);
    setProjectSlug("");
    setExpandedCategory(categorySlugValue);
    setPage(1);
  }

  function chooseProject(slug: string) {
    setSectionSlug("projects");
    setCategorySlug("");
    setSubcategorySlug("");
    setProjectSlug(slug);
    setPage(1);
  }

  function updateQueuedItem(id: string, patch: Partial<UploadQueueItem>) {
    setUploadQueue((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function uploadOne(item: UploadQueueItem) {
    updateQueuedItem(item.id, { status: "uploading", error: "", retryable: false });
    try {
      const uploadFile = await prepareUploadFile(item.file);
      const form = new FormData();
      form.append("file", uploadFile, item.file.name);
      if (item.replaceAsset) {
        form.append("replaceId", item.replaceAsset.assetKey);
      } else if (item.destination?.kind === "design") {
        form.append("placement", "design");
        form.append("categorySlug", item.destination.categorySlug);
        form.append("subcategorySlug", item.destination.subcategorySlug);
      } else if (item.destination?.kind === "project-gallery") {
        form.append("placement", "project-gallery");
        form.append("projectSlug", item.destination.projectSlug);
      } else {
        updateQueuedItem(item.id, { status: "failed", error: "Open a gallery before adding images.", retryable: false });
        return false;
      }
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Idempotency-Key": item.idempotencyKey },
        body: form,
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        const safeError = response.status === 413 || json.error?.includes("5 MB")
          ? "This image is larger than 5 MB."
          : response.status === 400 && json.error?.includes("valid JPG")
            ? "Choose a JPG, PNG or WebP image."
            : "Unable to upload this image. Please try again.";
        updateQueuedItem(item.id, { status: "failed", error: safeError, retryable: response.status >= 500 || response.status === 429 });
        return false;
      }
      updateQueuedItem(item.id, { status: "success", error: "", retryable: false });
      return true;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Unable to upload this image. Please try again.";
      updateQueuedItem(item.id, { status: "failed", error: message, retryable: message.startsWith("Unable to upload") });
      return false;
    }
  }

  async function finishSuccessfulMutation(successful: number, totalItems: number, replacement: boolean) {
    if (!successful) return;
    await refreshManagedCatalogueImages().catch(() => []);
    await loadRef.current(1);
    setPage(1);
    setNotice(replacement ? "Your image has been replaced." : successful === totalItems ? "Images added successfully." : `${successful} of ${totalItems} images uploaded.`);
  }

  async function runQueue(items: UploadQueueItem[], replacement = false) {
    if (!items.length || uploadLock.current || busy) return;
    uploadLock.current = true;
    setUploading(true);
    setError("");
    setNotice("");
    let successful = 0;
    for (const item of items) {
      if (await uploadOne(item)) successful += 1;
    }
    uploadLock.current = false;
    setUploading(false);
    await finishSuccessfulMutation(successful, items.length, replacement);
  }

  function queueUploads(files: File[], destination: UploadDestination | null, replaceAsset: Asset | null = null) {
    if (!files.length || uploadLock.current || busy || (!replaceAsset && !destination)) return;
    const batchId = crypto.randomUUID();
    const queued = files.map((file): UploadQueueItem => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return {
        id: crypto.randomUUID(),
        batchId,
        idempotencyKey: crypto.randomUUID(),
        file,
        previewUrl,
        destination,
        replaceAsset,
        status: "pending",
        error: "",
        retryable: false,
      };
    });
    setUploadQueue((current) => [...current, ...queued]);
    void runQueue(queued, Boolean(replaceAsset));
  }

  function openUploadPicker(destination: UploadDestination | null) {
    if (!destination || uploading || busy) return;
    selectionDestination.current = destination;
    fileRef.current?.click();
  }

  function onPickedFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const destination = selectionDestination.current;
    selectionDestination.current = null;
    event.target.value = "";
    if (files.length) queueUploads(files, destination);
  }

  function openReplacement(asset: Asset) {
    replacementTarget.current = asset;
    replacementRef.current?.click();
  }

  function onPickedReplacement(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const target = replacementTarget.current;
    replacementTarget.current = null;
    event.target.value = "";
    if (file && target) queueUploads([file], null, target);
  }

  async function updateAsset(asset: Asset, active: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    setAssets((current) => current.map((item) => item.assetKey === asset.assetKey ? { ...item, active } : item));
    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visibility", assetKey: asset.assetKey, active }),
      });
      const json = await response.json() as { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error();
      await refreshManagedCatalogueImages().catch(() => []);
      setPage(1);
      await loadRef.current(1);
      setNotice(active ? "Image is now visible on your website." : "Image is now hidden from your website.");
    } catch {
      setAssets((current) => current.map((item) => item.assetKey === asset.assetKey ? { ...item, active: asset.active } : item));
      setError("Unable to update image visibility. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateSelectedVisibility(active: boolean) {
    const targets = selectedAssets.filter((asset) => asset.canToggle);
    if (!targets.length) return;
    const previous = new Map(targets.map((asset) => [asset.assetKey, asset.active]));
    setBusy(true);
    setError("");
    setNotice("");
    setAssets((current) => current.map((item) => previous.has(item.assetKey) ? { ...item, active } : item));
    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visibility-bulk", assetKeys: targets.map((asset) => asset.assetKey), active }),
      });
      const json = await response.json() as { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error();
      await refreshManagedCatalogueImages().catch(() => []);
      setPage(1);
      await loadRef.current(1);
      setNotice(active ? "Selected images are now visible on your website." : "Selected images are now hidden from your website.");
    } catch {
      setAssets((current) => current.map((item) => previous.has(item.assetKey) ? { ...item, active: previous.get(item.assetKey)! } : item));
      setError("Unable to update image visibility. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(assetKey: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(assetKey)) next.delete(assetKey);
      else next.add(assetKey);
      return next;
    });
  }

  function togglePageSelection() {
    const allSelected = selectableAssets.length > 0 && selectableAssets.every((asset) => selectedKeys.has(asset.assetKey));
    setSelectedKeys((current) => {
      const next = new Set(current);
      selectableAssets.forEach((asset) => allSelected ? next.delete(asset.assetKey) : next.add(asset.assetKey));
      return next;
    });
  }

  async function confirmDelete() {
    const targets = deleteSelected ? selectedDeletable : deleteAsset ? [deleteAsset] : [];
    if (!targets.length) return;
    const selectedCount = targets.length;
    const protectedCount = deleteSelected ? Math.max(0, selectedAssets.length - selectedCount) : 0;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams();
      targets.forEach((asset) => params.append("key", asset.assetKey));
      const response = await fetch(`/api/admin/media?${params.toString()}`, { method: "DELETE" });
      const json = await response.json() as { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error();
      setDeleteAsset(null);
      setDeleteSelected(false);
      await refreshManagedCatalogueImages().catch(() => []);
      setPage(1);
      await loadRef.current(1);
      setNotice(protectedCount
        ? `Removed ${selectedCount} selected image${selectedCount === 1 ? "" : "s"}. ${protectedCount} website image${protectedCount === 1 ? " stayed" : "s stayed"} protected.`
        : selectedCount === 1 ? "Image removed from the website." : "Selected images removed from the website.");
    } catch {
      setError(selectedCount > 1 ? "Some selected images could not be removed. Images used elsewhere on the website stay protected." : "This image could not be removed. It may be used elsewhere on the website.");
      setDeleteAsset(null);
      setDeleteSelected(false);
      await loadRef.current(page);
    } finally {
      setBusy(false);
    }
  }

  async function assignImage() {
    if (!assignmentAsset || !assignmentCategory) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", assetKey: assignmentAsset.assetKey, categorySlug: assignmentCategory, subcategorySlug: assignmentSubcategory }),
      });
      const json = await response.json() as { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error();
      const categoryName = assignmentCategoryRecord?.name || "the selected category";
      const destinationCategory = assignmentCategory;
      const destinationSubcategory = assignmentSubcategory;
      setAssignmentAsset(null);
      setAssignmentCategory("");
      setAssignmentSubcategory("");
      setSectionSlug("explore-designs");
      setCategorySlug(destinationCategory);
      setSubcategorySlug(destinationSubcategory);
      setProjectSlug("");
      setExpandedCategory(destinationCategory);
      setPage(1);
      await refreshManagedCatalogueImages().catch(() => []);
      setNotice(`Image added to ${categoryName}.`);
    } catch {
      setError("This image could not be placed. Choose a valid category and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function retryUpload(item: UploadQueueItem) {
    if (!item.retryable || uploadLock.current || busy) return;
    uploadLock.current = true;
    setUploading(true);
    setError("");
    setNotice("");
    const success = await uploadOne(item);
    uploadLock.current = false;
    setUploading(false);
    if (success) await finishSuccessfulMutation(1, 1, Boolean(item.replaceAsset));
  }

  const currentSectionName = sectionSlug === ALL_SECTIONS ? "All website sections" : humanizeSection(sectionSlug, taxonomy);
  const breadcrumb = [currentSectionName, selectedCategory?.name, selectedSubcategory?.name, selectedProject?.name].filter(Boolean).join(" › ");
  const websiteSections = taxonomy?.sections.filter((item) => !["library", "other"].includes(item.slug)) || [];
  const visibleQueue = uploadQueue;
  const uploadBatches = [...new Set(visibleQueue.map((item) => item.batchId))];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B1C1C]">ATELIER — WALL STORY</p>
          <h2 className="mt-1 font-serif text-3xl font-normal sm:text-[34px]">Manage Images</h2>
        </div>
        {uploadDestination ? <button type="button" disabled={uploading || busy} onClick={() => openUploadPicker(uploadDestination)} className={adminButtonClass("primary", "sm")}><ImagePlus className="h-4 w-4" />Upload Images</button> : null}
      </header>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPickedFiles} />
      <input ref={replacementRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickedReplacement} />

      <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-3 sm:p-4">
          <nav aria-label="Website sections" className="space-y-1">
            <button type="button" onClick={() => chooseSection(ALL_SECTIONS)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === ALL_SECTIONS ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>All website sections</span></button>
            {websiteSections.map((section) => <button type="button" key={section.slug} onClick={() => chooseSection(section.slug)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === section.slug && !categorySlug && !projectSlug ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>{section.name}</span><span className="text-xs text-[#746B64]">{section.imageCount}</span></button>)}
            {otherCount > 0 ? <button type="button" onClick={() => chooseSection("other")} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === "other" ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>Other website images</span><span className="text-xs text-[#746B64]">{otherCount}</span></button> : null}
            {unassignedCount > 0 ? <button type="button" onClick={() => chooseSection("library")} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === "library" ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span>Needs a home</span><span className="text-xs text-[#746B64]">{unassignedCount}</span></button> : null}
          </nav>

          <div className="border-t border-[#E8DED3] pt-3">
            <div className="mb-2 flex items-center justify-between px-2"><h3 className="text-xs font-semibold uppercase tracking-[0.13em] text-[#746B64]">Design categories</h3></div>
            <div className="max-h-[48vh] space-y-1 overflow-y-auto pr-1">
              {categories.map((category) => {
                const expanded = expandedCategory === category.slug;
                const selected = sectionSlug === "explore-designs" && categorySlug === category.slug;
                return <div key={category.slug} className="rounded-xl">
                  <div className={`flex items-center rounded-xl ${selected ? "bg-[#9B1C1C]/[0.08]" : "hover:bg-[#FAF6F0]"}`}>
                    <button type="button" onClick={() => chooseCategory(category.slug)} className={`min-w-0 flex-1 px-3 py-2.5 text-left text-sm ${selected ? "font-semibold text-[#9B1C1C]" : "text-[#574F49]"}`}><span className="break-words">{category.name}</span>{category.retired ? <span className="ml-1 text-[10px] text-[#928980]">Archived</span> : null}</button>
                    <span className="mr-1 text-xs text-[#746B64]">{category.imageCount}</span>
                    <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`} onClick={() => { setExpandedCategory(expanded ? "" : category.slug); setSectionSlug("explore-designs"); setCategorySlug(category.slug); setSubcategorySlug(""); setProjectSlug(""); setPage(1); }} className="rounded-lg p-2 text-[#746B64] hover:text-[#9B1C1C]">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                  </div>
                  {expanded ? <div className="ml-3 mt-1 border-l border-[#E8DED3] pl-2">
                    <button type="button" onClick={() => chooseCategory(category.slug)} className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${!subcategorySlug && selected ? "bg-white font-semibold text-[#9B1C1C]" : "text-[#746B64] hover:bg-white"}`}><span>All in {category.name}</span><span>{category.imageCount}</span></button>
                    {category.subcategories.map((subcategory) => <button type="button" key={subcategory.slug} onClick={() => chooseSubcategory(category.slug, subcategory.slug)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${selected && subcategorySlug === subcategory.slug ? "bg-white font-semibold text-[#9B1C1C]" : "text-[#746B64] hover:bg-white"}`}><span className="truncate">{subcategory.name}</span><span className="ml-2">{subcategory.imageCount}</span></button>)}
                  </div> : null}
                </div>;
              })}
            </div>
          </div>

          {projects.length ? <div className="border-t border-[#E8DED3] pt-3">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#746B64]">Project galleries</h3>
            <div className="space-y-1">
              {projects.map((project) => <button type="button" key={project.slug} onClick={() => chooseProject(project.slug)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${sectionSlug === "projects" && projectSlug === project.slug ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "text-[#574F49] hover:bg-[#FAF6F0]"}`}><span className="min-w-0 truncate pr-2">{project.name}</span><span className="text-xs text-[#746B64]">{project.imageCount}</span></button>)}
            </div>
          </div> : null}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9B1C1C]">{breadcrumb}</p><h3 className="mt-1 font-serif text-2xl">{selectedSubcategory?.name || selectedCategory?.name || selectedProject?.name || currentSectionName}</h3></div>
              {uploadDestination ? <p className="rounded-full bg-[#F5EEE6] px-3 py-1.5 text-xs text-[#574F49]">Adding to: <span className="font-medium">{uploadDestination.label}</span></p> : null}
            </div>
            {sectionSlug === ALL_SECTIONS ? <p className="mt-4 border-t border-[#E8DED3] pt-3 text-sm text-[#746B64]">Open a website section, design category or project gallery before adding images.</p> : null}
            {sectionSlug === "explore-designs" && !selectedCategory ? <p className="mt-4 border-t border-[#E8DED3] pt-3 text-sm text-[#746B64]">Open a design category to add images.</p> : null}
            {sectionSlug === "projects" && !selectedProject ? <p className="mt-4 border-t border-[#E8DED3] pt-3 text-sm text-[#746B64]">Open a project gallery to add images.</p> : null}

            {error ? <p role="alert" className="mt-4 rounded-lg bg-[#FCEEEE] p-3 text-sm text-[#9B1C1C]">{error}</p> : null}
            {notice ? <p role="status" className="mt-4 rounded-lg bg-[#EDF5EE] p-3 text-sm text-[#264E32]">{notice}</p> : null}
            {uploading ? <p role="status" className="mt-4 text-sm text-[#746B64]">Uploading your images...</p> : null}

            {uploadQueue.length > 0 ? <div className="mt-4 space-y-2 border-t border-[#E8DED3] pt-3">
              {uploadBatches.map((batchId) => {
                const batch = visibleQueue.filter((item) => item.batchId === batchId);
                const complete = batch.filter((item) => item.status === "success").length;
                return <div key={batchId}>
                  {batch.length > 1 || batch.some((item) => item.status === "uploading") ? <p className="mb-2 text-xs text-[#746B64]">{complete} of {batch.length} images uploaded.</p> : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {batch.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E8DED3] bg-white p-2.5">
                      <img src={item.previewUrl} alt="Selected image" className="h-12 w-14 shrink-0 rounded-lg bg-[#F2EAE1] object-cover" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{readableFileName(item.file.name)}</p><p className={`mt-0.5 text-xs ${item.status === "failed" ? "text-[#9B1C1C]" : item.status === "success" ? "text-[#315B3B]" : "text-[#746B64]"}`}>{item.status === "uploading" ? "Uploading..." : item.status === "success" ? (item.replaceAsset ? "Replaced" : "Added") : item.status === "failed" ? item.error : "Waiting"}</p></div>
                      {item.status === "failed" && item.retryable ? <button type="button" disabled={uploading || busy} onClick={() => void retryUpload(item)} className="rounded-lg p-2 text-[#9B1C1C] hover:bg-[#F8ECE8]" aria-label={`Retry ${readableFileName(item.file.name)}`}><RotateCcw size={15} /></button> : null}
                    </div>)}
                  </div>
                </div>;
              })}
            </div> : null}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter images by visibility">
            {([
              ["all", "All Images"],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ] as const).map(([filter, label]) => <button type="button" key={filter} aria-pressed={visibilityFilter === filter} onClick={() => { setVisibilityFilter(filter); setPage(1); setSelectedKeys(new Set()); }} className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${visibilityFilter === filter ? "border-[#9B1C1C] bg-[#9B1C1C] text-white" : "border-[#E8DED3] bg-[#FFFDF9] text-[#574F49] hover:bg-[#FAF6F0]"}`}>{label}<span className={`ml-2 text-xs ${visibilityFilter === filter ? "text-white/80" : "text-[#746B64]"}`}>{counts[filter]}</span></button>)}
          </div>

          {selectableAssets.length > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8DED3] bg-[#FFFDF9] px-3 py-2.5">
            <button type="button" disabled={busy || uploading || loading} onClick={togglePageSelection} className="mr-auto rounded-lg px-2 py-1.5 text-xs font-medium text-[#574F49] hover:bg-[#F5EEE6]">{selectableAssets.every((asset) => selectedKeys.has(asset.assetKey)) ? "Clear selection" : "Select all on this page"}</button>
            {selectedAssets.length ? <span className="text-xs text-[#746B64]">{selectedAssets.length} selected{selectedAssets.length > selectedDeletable.length ? ` · ${selectedAssets.length - selectedDeletable.length} protected` : ""}</span> : null}
            <button type="button" disabled={!selectedToggleable.length || busy || uploading || loading} onClick={() => void updateSelectedVisibility(true)} className={adminButtonClass("secondary", "sm")}>Set Active</button>
            <button type="button" disabled={!selectedToggleable.length || busy || uploading || loading} onClick={() => void updateSelectedVisibility(false)} className={adminButtonClass("secondary", "sm")}>Set Inactive</button>
            <button type="button" disabled={!selectedAssets.length || busy || uploading || loading} onClick={() => setDeleteSelected(true)} className={adminButtonClass("secondary", "sm")}><Trash2 size={13} />Delete selected</button>
          </div> : null}

          {loading ? <div role="status" className="rounded-2xl border border-[#E8DED3] bg-[#FFFDF9] p-12 text-center text-sm text-[#746B64]">Loading images…</div> : assets.length === 0 && !uploadDestination ? <div className="rounded-2xl border border-dashed border-[#DFD0C0] bg-[#FFFDF9] p-10 text-center"><Images className="mx-auto mb-3 text-[#9B1C1C]" /><p className="font-medium">{visibilityFilter === "active" ? "No active images here" : visibilityFilter === "inactive" ? "No inactive images here" : "No images here yet"}</p></div> : <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {uploadDestination ? <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); queueUploads(Array.from(event.dataTransfer.files), uploadDestination); }} className="flex min-h-[270px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBB8A5] bg-[#FFFDF9] p-5 text-center transition-colors hover:border-[#9B1C1C] hover:bg-[#FAF6F0]">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#9B1C1C]/[0.08] text-[#9B1C1C]"><ImagePlus size={22} /></div>
              <p className="font-medium">Add Images</p>
              <p className="mt-2 max-w-[230px] text-xs leading-relaxed text-[#746B64]">Adding to {uploadDestination.label}</p>
              <button type="button" disabled={uploading || busy} onClick={() => openUploadPicker(uploadDestination)} className={`${adminButtonClass("primary", "sm")} mt-4`}><Upload size={14} />Choose Images</button>
              <p className="mt-3 text-[11px] text-[#928980]">You can also drop photos here</p>
            </div> : null}
            {assets.map((asset) => <article key={asset.assetKey} className="overflow-hidden rounded-2xl border border-[#E8DED3] bg-[#FFFDF9]">
              <div className="relative">
                <button type="button" onClick={() => setPreviewing(asset)} aria-label={`Preview ${asset.displayName}`} className="block w-full cursor-zoom-in"><img src={asset.secureUrl} alt={asset.altText} loading="lazy" width={asset.width || undefined} height={asset.height || undefined} className="aspect-[4/3] w-full bg-[#EDE4DA] object-contain" /></button>
                {asset.canToggle || asset.canDelete ? <label className="absolute left-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/95 shadow-sm" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${asset.displayName}`} checked={selectedKeys.has(asset.assetKey)} onChange={() => toggleSelected(asset.assetKey)} disabled={busy || uploading} className="h-4 w-4 accent-[#9B1C1C]" /></label> : null}
              </div>
              <div className="space-y-3 p-3.5">
                <p className="truncate text-sm font-semibold" title={asset.displayName}>{asset.displayName || "Website image"}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#574F49]">{asset.active ? "Active" : "Inactive"}</span>
                  <button type="button" role="switch" aria-checked={asset.active} aria-label={`${asset.displayName} visibility`} disabled={!asset.canToggle || busy || uploading} onClick={() => void updateAsset(asset, !asset.active)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${asset.active ? "bg-[#34784A]" : "bg-[#B8B5B1]"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${asset.active ? "translate-x-6" : "translate-x-1"}`} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sectionSlug !== "library" ? <button type="button" disabled={busy || uploading} onClick={() => openReplacement(asset)} className={adminButtonClass("secondary", "sm")}><Upload size={13} />Replace Image</button> : null}
                  {sectionSlug === "library" ? <button type="button" disabled={busy || uploading} onClick={() => { setAssignmentAsset(asset); setAssignmentCategory(""); setAssignmentSubcategory(""); }} className={adminButtonClass("secondary", "sm")}><Images size={13} />Choose category</button> : null}
                  {asset.canDelete ? <button type="button" disabled={busy || uploading} onClick={() => setDeleteAsset(asset)} className={adminButtonClass("secondary", "sm")}><Trash2 size={13} />Delete</button> : null}
                </div>
              </div>
            </article>)}
          </div>}

          {!loading && (assets.length > 0 || uploadDestination) ? <div className="flex items-center justify-between rounded-xl border border-[#E8DED3] bg-[#FFFDF9] px-4 py-3 text-xs text-[#746B64]"><span>{total} image{total === 1 ? "" : "s"}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className={adminButtonClass("secondary", "sm")}>Previous</button><button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className={adminButtonClass("secondary", "sm")}>Next</button></div></div> : null}
        </section>
      </div>

      {previewing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/70 p-4" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setPreviewing(null)}><div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-[#FFFDF9] p-3 sm:p-5" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-3 pb-3"><p className="truncate text-sm font-medium">{previewing.displayName}</p><button type="button" aria-label="Close preview" onClick={() => setPreviewing(null)} className="rounded-lg p-2 text-[#746B64] hover:bg-[#F2EAE1]"><X size={18} /></button></div><img src={previewing.secureUrl} alt={previewing.altText} className="min-h-0 flex-1 rounded-xl bg-[#F2EAE1] object-contain" /></div></div> : null}

      {assignmentAsset ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="assign-image-title"><div className="w-full max-w-md rounded-2xl border border-[#DFD0C0] bg-[#FFFDF9] p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><h3 id="assign-image-title" className="font-serif text-2xl">Choose a category</h3><p className="mt-1 text-sm text-[#746B64]">Add this image to a website design gallery.</p></div><button type="button" disabled={busy} aria-label="Close" onClick={() => setAssignmentAsset(null)} className="rounded-lg p-2 text-[#746B64] hover:bg-[#F2EAE1]"><X size={17} /></button></div><label className="mt-5 block text-xs font-medium text-[#574F49]">Design category<select className={`${adminInputClass} mt-1`} value={assignmentCategory} onChange={(event) => { setAssignmentCategory(event.target.value); setAssignmentSubcategory(""); }}><option value="">Choose a category</option>{categories.filter((category) => category.isPublic).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>{assignmentCategoryRecord?.subcategories.length ? <label className="mt-4 block text-xs font-medium text-[#574F49]">Subcategory<select className={`${adminInputClass} mt-1`} value={assignmentSubcategory} onChange={(event) => setAssignmentSubcategory(event.target.value)}><option value="">Category gallery</option>{assignmentCategoryRecord.subcategories.map((subcategory) => <option key={subcategory.slug} value={subcategory.slug}>{subcategory.name}</option>)}</select></label> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setAssignmentAsset(null)} className={adminButtonClass("secondary", "sm")}>Cancel</button><button type="button" disabled={busy || !assignmentCategory} onClick={() => void assignImage()} className={adminButtonClass("primary", "sm")}>{busy ? "Adding…" : "Add to website"}</button></div></div></div> : null}

      {deleteSelected && !selectedDeletable.length ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="protected-images-title"><div className="w-full max-w-md rounded-2xl border border-[#DFD0C0] bg-[#FFFDF9] p-6 shadow-xl"><h2 id="protected-images-title" className="font-serif text-2xl">These images are protected</h2><p className="mt-2 text-sm leading-relaxed text-[#746B64]">The selected images are used by the website, so they can’t be deleted. You can hide them with Set Inactive or replace them.</p><div className="mt-5 flex justify-end"><button type="button" onClick={() => setDeleteSelected(false)} className={adminButtonClass("primary", "sm")}>Got it</button></div></div></div> : null}
      <AdminConfirmModal open={Boolean(deleteAsset) || (deleteSelected && selectedDeletable.length > 0)} title={deleteSelected ? `Remove ${selectedDeletable.length} selected image${selectedDeletable.length === 1 ? "" : "s"}?` : "Remove this image from your website?"} description={deleteSelected ? selectedAssets.length > selectedDeletable.length ? "Only unused images will be removed. Images used by the website will stay protected." : "These images will be removed. Images used in other parts of the website stay protected." : "This image will be removed from its gallery. Images used in other parts of the website stay protected."} confirmLabel={deleteSelected ? `Remove ${selectedDeletable.length === 1 ? "image" : "selected images"}` : "Remove image"} busy={busy} onCancel={() => { setDeleteAsset(null); setDeleteSelected(false); }} onConfirm={() => void confirmDelete()} />
    </div>
  );
}
