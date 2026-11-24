"use client";

import React, { useMemo } from "react";
import {
  TumbleDeckShowcase,
  type TumbleCard,
} from "@/components/ui/tumble-deck-showcase";
import {
  buildAtelierVaultCategories,
  DESIGN_CATEGORY_RECORDS,
  DEVELOPMENT_FIXTURE_DESIGNS,
  mergeManagedCategoryImages,
  type CatalogueCategoryRecord,
  type CatalogueDesignItem,
} from "@/lib/designs-catalogue";
import { useManagedCatalogueDesigns, useManagedCatalogueImages } from "@/lib/catalogue-images-client";

export function AtelierTumbleGallery() {
  const [managedImages] = useManagedCatalogueImages();
  const catalogueCategories: ReadonlyArray<CatalogueCategoryRecord> = useMemo(
    () => managedImages.length ? mergeManagedCategoryImages(DESIGN_CATEGORY_RECORDS, managedImages) : DESIGN_CATEGORY_RECORDS,
    [managedImages],
  );
  const catalogueDesigns: ReadonlyArray<CatalogueDesignItem> = useManagedCatalogueDesigns(DEVELOPMENT_FIXTURE_DESIGNS);

  const tumbleCards: ReadonlyArray<TumbleCard> = useMemo(() => {
    const vaultCategories = buildAtelierVaultCategories(
      catalogueCategories,
      catalogueDesigns
    );
    const publishedDesigns = catalogueDesigns.filter((d) => d.published);
    const totalLabel = String(vaultCategories.length).padStart(2, "0");

    return vaultCategories
      .map((cat) => {
        const repDesign = publishedDesigns.find(
          (d) =>
            d.categorySlug.toLowerCase() === cat.slug.toLowerCase() ||
            d.categoryId === cat.id ||
            d.categorySlotNumber === cat.slotNumber
        );

        const primarySrc = (
          cat.coverImage ||
          repDesign?.coverImage?.secureUrl ||
          cat.fallbackImage ||
          ""
        ).trim();

        const displayTitle = `${cat.title} Wall Art Collection`;

        const surfacesLabel =
          cat.compatibleSurfaces && cat.compatibleSurfaces.length > 0
            ? cat.compatibleSurfaces.slice(0, 3).join(" · ")
            : "Architectural Surfaces";

        return {
          src: primarySrc,
          fallbackSrc: cat.fallbackImage?.trim() || primarySrc,
          alt: cat.altText,
          number: cat.number,
          totalLabel,
          title: displayTitle,
          subtitle: `${cat.title}  ·  ${surfacesLabel}`,
          href: `/explore-designs?category=${cat.slug}`,
          ctaLabel: "Explore Category",
        };
      })
      .filter((card) => Boolean(card.src));
  }, [catalogueCategories, catalogueDesigns]);

  if (tumbleCards.length === 0) {
    return null;
  }

  return (
    <section
      id="atelier-wall-art-collection"
      aria-label="Atelier 3D Wall Art Collection"
      className="relative w-full border-0 bg-[#F8F2EA] outline-none"
    >
      <TumbleDeckShowcase
        cards={tumbleCards}
        ariaLabel={`Atelier Wall Art ${catalogueCategories.length} Category 3D Tumble Deck`}
        height="calc(100svh - var(--navbar-height, 74px))"
        aspect={1.62}
        scrollPerCard={240}
        depth={5}
        background="#F8F2EA"
      />
    </section>
  );
}

export default AtelierTumbleGallery;
