"use client";

import { useEffect, useState } from "react";
import {
  mergeManagedDesignImages,
  type CatalogueDesignItem,
  type ManagedCatalogueImage,
} from "@/lib/designs-catalogue";

let catalogueRequest: Promise<ManagedCatalogueImage[]> | null = null;
let catalogueFetchedAt = 0;
const CATALOGUE_FRESH_FOR_MS = 60_000;
const catalogueListeners = new Set<(images: ManagedCatalogueImage[]) => void>();
const UPDATE_STORAGE_KEY = "atelier-managed-images-updated";

function loadManagedImages(force = false, fresh = false) {
  if (force || Date.now() - catalogueFetchedAt > CATALOGUE_FRESH_FOR_MS) catalogueRequest = null;
  if (!catalogueRequest) {
    catalogueRequest = fetch(fresh ? "/api/site-images?fresh=1" : "/api/site-images", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Image catalogue unavailable");
        const data = await response.json() as { images?: ManagedCatalogueImage[] };
        const images = Array.isArray(data.images) ? data.images : [];
        catalogueFetchedAt = Date.now();
        catalogueListeners.forEach((listener) => listener(images));
        return images;
      })
      .catch(() => {
        catalogueRequest = null;
        return [];
      });
  }
  return catalogueRequest;
}

export function useManagedCatalogueDesigns(staticDesigns: ReadonlyArray<CatalogueDesignItem>) {
  const [images] = useManagedCatalogueImages();
  return images.length ? mergeManagedDesignImages(staticDesigns, images) : staticDesigns;
}

export function useManagedCatalogueImages(): [ManagedCatalogueImage[], (images: ManagedCatalogueImage[]) => void] {
  const [images, setImages] = useState<ManagedCatalogueImage[]>([]);
  useEffect(() => {
    let active = true;
    const update = (next: ManagedCatalogueImage[]) => { if (active) setImages(next); };
    catalogueListeners.add(update);
    void loadManagedImages().then((next) => { if (active) setImages(next); });
    const refreshWhenVisible = () => { if (!document.hidden) void loadManagedImages(true); };
    const handleStorage = (event: StorageEvent) => { if (event.key === UPDATE_STORAGE_KEY) void loadManagedImages(true, true); };
    const refreshInterval = window.setInterval(() => {
      if (!document.hidden && Date.now() - catalogueFetchedAt > CATALOGUE_FRESH_FOR_MS) void loadManagedImages(true);
    }, CATALOGUE_FRESH_FOR_MS);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      catalogueListeners.delete(update);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(refreshInterval);
    };
  }, []);
  return [images, setImages];
}

export async function refreshManagedCatalogueImages() {
  const images = await loadManagedImages(true, true);
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(UPDATE_STORAGE_KEY, String(Date.now())); } catch { /* storage can be disabled */ }
  }
  return images;
}
