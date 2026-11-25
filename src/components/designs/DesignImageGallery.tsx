"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  DESIGN_CATEGORY_RECORDS,
  DEVELOPMENT_FIXTURE_DESIGNS,
  findDesignBySlugOrId,
  mergeManagedCategoryImages,
  mergeManagedDesignImages,
  resolveCategoryFromQuery,
  type CatalogueDesignItem,
} from "@/lib/designs-catalogue";
import { useManagedCatalogueImages } from "@/lib/catalogue-images-client";

export function DesignImageGallery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [managedImages] = useManagedCatalogueImages();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const categories = useMemo(
    () =>
      managedImages.length
        ? mergeManagedCategoryImages(DESIGN_CATEGORY_RECORDS, managedImages)
        : DESIGN_CATEGORY_RECORDS,
    [managedImages],
  );
  const designs = useMemo(
    () =>
      managedImages.length
        ? mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, managedImages)
        : DEVELOPMENT_FIXTURE_DESIGNS,
    [managedImages],
  );
  const availableCategories = useMemo(
    () => categories.filter((category) =>
      designs.some((design) => design.published && design.categorySlug === category.slug),
    ),
    [categories, designs],
  );

  const activeCategory = useMemo(
    () =>
      resolveCategoryFromQuery({
        categoryParam: searchParams.get("category"),
        slotParam: searchParams.get("slot"),
        categories: availableCategories,
      }),
    [availableCategories, searchParams],
  );
  const activeCategorySlug = activeCategory?.slug || "all";
  const visibleDesigns = useMemo(
    () =>
      designs.filter((design) =>
        design.published &&
        (activeCategorySlug === "all" || design.categorySlug === activeCategorySlug),
      ),
    [activeCategorySlug, designs],
  );
  const designParam = searchParams.get("design") || "";
  const selectedDesign = useMemo(
    () => findDesignBySlugOrId(designParam, visibleDesigns),
    [designParam, visibleDesigns],
  );
  const selectedDesignIndex = selectedDesign
    ? visibleDesigns.findIndex((design) => design.id === selectedDesign.id)
    : -1;

  const updateUrl = useCallback(
    (nextCategorySlug: string, nextDesignSlug?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("slot");
      if (nextCategorySlug === "all") params.delete("category");
      else params.set("category", nextCategorySlug);
      if (nextDesignSlug !== undefined) {
        if (nextDesignSlug) params.set("design", nextDesignSlug);
        else params.delete("design");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectCategory = useCallback((slug: string) => {
    updateUrl(slug, null);
  }, [updateUrl]);

  const openPreview = useCallback(
    (design: CatalogueDesignItem) => {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      updateUrl(activeCategorySlug, design.slug);
    },
    [activeCategorySlug, updateUrl],
  );

  const closePreview = useCallback(
    () => {
      updateUrl(activeCategorySlug, null);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    },
    [activeCategorySlug, updateUrl],
  );

  const movePreview = useCallback(
    (direction: -1 | 1) => {
      if (selectedDesignIndex < 0 || visibleDesigns.length < 2) return;
      const nextIndex =
        (selectedDesignIndex + direction + visibleDesigns.length) % visibleDesigns.length;
      const nextDesign = visibleDesigns[nextIndex];
      if (nextDesign) updateUrl(activeCategorySlug, nextDesign.slug);
    },
    [activeCategorySlug, selectedDesignIndex, updateUrl, visibleDesigns],
  );

  useEffect(() => {
    if (!selectedDesign) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreview();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePreview(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePreview(1);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePreview, movePreview, selectedDesign]);

  return (
    <section className="min-h-[72vh] bg-[#F7F3ED] py-6 sm:py-9" aria-labelledby="design-gallery-title">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-7 lg:px-10">
        <h1 id="design-gallery-title" className="sr-only">Explore Designs</h1>

        <nav aria-label="Design categories" className="mb-6 overflow-x-auto border-b border-[#DDD2C5] pb-3 sm:mb-8">
          <div className="flex min-w-max items-center gap-2">
            <button
              type="button"
              aria-pressed={activeCategorySlug === "all"}
              onClick={() => selectCategory("all")}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B1C1C] ${activeCategorySlug === "all" ? "bg-[#9B1C1C] text-white" : "border border-[#DDD2C5] bg-white/70 text-[#514941] hover:border-[#9B1C1C]"}`}
            >
              All designs
            </button>
            {availableCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={activeCategorySlug === category.slug}
                onClick={() => selectCategory(category.slug)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B1C1C] ${activeCategorySlug === category.slug ? "bg-[#9B1C1C] text-white" : "border border-[#DDD2C5] bg-white/70 text-[#514941] hover:border-[#9B1C1C]"}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visibleDesigns.map((design) => (
            <button
              key={design.id}
              type="button"
              onClick={() => openPreview(design)}
              aria-label={`View ${design.title}`}
              className="group relative block w-full cursor-zoom-in overflow-hidden bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B1C1C]"
              style={{
                aspectRatio: `${design.coverImage.width || 4} / ${design.coverImage.height || 5}`,
              }}
            >
              <Image
                src={design.coverImage.secureUrl}
                alt={design.title}
                fill
                unoptimized
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.025] sm:p-3"
              />
            </button>
          ))}
        </div>
      </div>

      {selectedDesign ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Design preview"
          ref={dialogRef}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#171514]/95 p-3 sm:p-8"
          tabIndex={-1}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <button
            type="button"
            onClick={closePreview}
            ref={closeButtonRef}
            aria-label="Close design preview"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" />
          </button>

          {visibleDesigns.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => movePreview(-1)}
                aria-label="Previous design"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => movePreview(1)}
                aria-label="Next design"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div className="relative h-full max-h-[92vh] w-full max-w-[1400px]">
            <Image
              src={selectedDesign.coverImage.secureUrl}
              alt={selectedDesign.title}
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
