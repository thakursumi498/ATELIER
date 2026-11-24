"use client";

import { useEffect, useState } from "react";
import {
  mergeManagedDesignImages,
  type CatalogueDesignItem,
  type ManagedCatalogueImage,
} from "@/lib/designs-catalogue";

let catalogueRequest: Promise<ManagedCatalogueImage[]> | null = null;

function loadManagedImages() {
  if (!catalogueRequest) {
    catalogueRequest = fetch("/api/site-images", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Image catalogue unavailable");
        const data = await response.json() as { images?: ManagedCatalogueImage[] };
        return Array.isArray(data.images) ? data.images : [];
      })
      .catch(() => []);
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
    void loadManagedImages().then((next) => { if (active) setImages(next); });
    return () => { active = false; };
  }, []);
  return [images, setImages];
}

export async function refreshManagedCatalogueImages() {
  catalogueRequest = null;
  return loadManagedImages();
}
