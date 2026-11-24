/**
 * Canonical Data & Category Architecture for Page 02 — Explore Designs (`/explore-designs`).
 *
 * Aligns with `DesignCategoryDocument` and `DesignDocument` in `@/types/models`.
 * The Drive manifest provides default public artwork, category covers, and stable
 * enquiry codes; Cloudinary supplies image URLs while all copy remains here.
 */

import {
  CATALOGUE_CATEGORY_SLOTS,
  DesignCategoryDocument,
  MediaAssetRef,
} from "@/types/models";
import { DRIVE_CATEGORY_ASSETS } from "@/lib/drive-category-assets";

export interface ExploreDesignsHeroConfig {
  eyebrow: string;
  headline: string;
  supportingText: string;
  description: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  heroImage: string;
  heroImageAlt: string;
  isProvisionalCopy: boolean;
}

export const EXPLORE_DESIGNS_HERO_CONTENT: ExploreDesignsHeroConfig = {
  eyebrow: "THE ATELIER COLLECTION",
  headline: "Explore Wall Art Designs for Every Space",
  supportingText:
    "A curated collection of murals and surface artworks crafted to bring character, texture, and personality to architectural spaces.",
  description:
    "A curated collection of murals and surface artworks crafted to bring character, texture, and personality to architectural spaces.",
  primaryCtaLabel: "Browse Collection",
  secondaryCtaLabel: "Preview on Your Wall",
  heroImage: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-hero-curated-gallery.webp",
  heroImageAlt:
    "Light-filled design showroom with three wall bays printed with botanical, marble-vein and terracotta geometric artworks",
  isProvisionalCopy: false,
};

export interface CatalogueCategoryRecord extends DesignCategoryDocument {
  slotCode: string;
  shortTitle: string;
}

export function isHiddenCatalogueCategory(category: {
  slotNumber?: number;
  name?: string | null;
  slug?: string | null;
}): boolean {
  return (
    category.slotNumber === 6 ||
    category.slug?.trim().toLowerCase() === "logo" ||
    category.name?.trim().toLowerCase() === "logo"
  );
}

const PUBLIC_DRIVE_CATEGORY_ASSETS = DRIVE_CATEGORY_ASSETS.filter(
  (category) => !isHiddenCatalogueCategory(category),
);

export const DESIGN_CATEGORY_RECORDS: ReadonlyArray<CatalogueCategoryRecord> =
  CATALOGUE_CATEGORY_SLOTS.flatMap((slot) => {
    const category = DRIVE_CATEGORY_ASSETS.find(
      (candidate) => candidate.slotNumber === slot.slotNumber,
    );
    if (!category || isHiddenCatalogueCategory(category)) return [];
    const cover = category.images[0];
    return [{
      id: `category-slot-${slot.slotNumber}`,
      slotNumber: slot.slotNumber,
      slotCode: slot.slotCode,
      name: category.name,
      shortTitle: category.name,
      slug: category.slug,
      description: category.description,
      coverImage: cover
        ? {
            publicId: `categories/${category.slug}/${cover.code}`,
            secureUrl: cover.url,
            resourceType: "image",
            width: cover.width,
            height: cover.height,
            format: cover.format,
            altText: `${category.name}: ${cover.title} (${cover.code})`,
          }
        : null,
      displayOrder: slot.slotNumber,
      isActive: true,
      isConfigured: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }];
  });

export interface CatalogueDesignItem {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categorySlotNumber: number;
  categoryCode: string;
  artworkCode?: string;
  subCategoryLabel?: string;
  categoryLabel: string;
  summary: string;
  description: string;
  tags: ReadonlyArray<string>;
  compatibleSurfaces: ReadonlyArray<string>;
  dimensionsNote: string;
  coverImage: MediaAssetRef;
  galleryMedia: ReadonlyArray<MediaAssetRef>;
  videoAsset: MediaAssetRef | null;
  aspectRatio: "portrait" | "landscape" | "square";
  featured: boolean;
  published: boolean;
  sortOrder: number;
  isDevelopmentFixture: boolean;
  visualizerConfig: {
    defaultMode: "mural" | "pattern";
    textureUrl: string;
    width: number;
    height: number;
    mimeType: string;
  };
}

export interface ManagedCatalogueImage {
  id: string;
  publicId: string;
  secureUrl: string;
  altText: string;
  width: number;
  height: number;
  format: string;
  categorySlug: string;
  artworkCode: string;
  subcategorySlug?: string;
  subcategoryName?: string;
  replacesCategorySlug?: string;
  replacesArtworkCode?: string;
  displayOrder: number;
  active: boolean;
}

/** Merge Cloudinary image metadata into the source-controlled catalogue copy. */
export function mergeManagedDesignImages(
  staticDesigns: ReadonlyArray<CatalogueDesignItem>,
  images: ReadonlyArray<ManagedCatalogueImage>,
): CatalogueDesignItem[] {
  const byKey = new Map(images.map((image) => [`${image.categorySlug}:${image.artworkCode.toUpperCase()}`, image]));
  const replacedStaticKeys = new Set(images.flatMap((image) =>
    image.replacesCategorySlug && image.replacesArtworkCode
      ? [`${image.replacesCategorySlug}:${image.replacesArtworkCode.toUpperCase()}`]
      : [],
  ));
  const used = new Set<string>();
  const result: CatalogueDesignItem[] = [];

  for (const design of staticDesigns) {
    const key = `${design.categorySlug}:${(design.artworkCode || "").toUpperCase()}`;
    if (replacedStaticKeys.has(key) && !byKey.has(key)) continue;
    const image = byKey.get(key);
    if (image) {
      used.add(key);
      if (!image.active) continue;
      result.push({
        ...design,
        subCategoryLabel: image.subcategoryName || design.subCategoryLabel,
        sortOrder: Number.isInteger(image.displayOrder) ? image.displayOrder : design.sortOrder,
        coverImage: { ...design.coverImage, publicId: image.publicId, secureUrl: image.secureUrl, width: image.width || design.coverImage.width, height: image.height || design.coverImage.height, format: image.format || design.coverImage.format, altText: image.altText },
        visualizerConfig: { ...design.visualizerConfig, textureUrl: image.secureUrl, width: image.width || design.visualizerConfig.width, height: image.height || design.visualizerConfig.height, mimeType: `image/${image.format || "webp"}` },
      });
    } else result.push(design);
  }

  for (const image of images) {
    const key = `${image.categorySlug}:${image.artworkCode.toUpperCase()}`;
    if (!image.active || used.has(key) || result.some((design) => `${design.categorySlug}:${(design.artworkCode || "").toUpperCase()}` === key)) continue;
    const category = DESIGN_CATEGORY_RECORDS.find((entry) => entry.slug === image.categorySlug);
    if (!category || !/^AE\d{2}-\d{2}$/i.test(image.artworkCode)) continue;
    const title = image.altText.trim() || image.artworkCode;
    const ratio = image.width && image.height ? image.width / image.height : 1;
    const media: MediaAssetRef = { publicId: image.publicId, secureUrl: image.secureUrl, resourceType: "image", width: image.width, height: image.height, format: image.format || "webp", altText: title };
    result.push({
      id: `cloudinary-${image.publicId}`, title, slug: `${category.slug}-${image.artworkCode.toLowerCase()}`, categoryId: category.id, categorySlug: category.slug, categorySlotNumber: category.slotNumber, categoryCode: category.slotCode, artworkCode: image.artworkCode.toUpperCase(), subCategoryLabel: image.subcategoryName, categoryLabel: category.name, summary: `${image.artworkCode} from the ${category.name} collection.`, description: `${title} is part of the ${category.name} collection. Share artwork code ${image.artworkCode} when enquiring about this design.`, tags: [category.slug, category.name.toLowerCase()], compatibleSurfaces: ["Walls"], dimensionsNote: "Available in custom sizes for your wall.", coverImage: media, galleryMedia: [], videoAsset: null, aspectRatio: ratio > 1.15 ? "landscape" : ratio < 0.87 ? "portrait" : "square", featured: false, published: true, sortOrder: Number.isInteger(image.displayOrder) ? image.displayOrder : 999, isDevelopmentFixture: false, visualizerConfig: { defaultMode: "mural", textureUrl: image.secureUrl, width: image.width, height: image.height, mimeType: `image/${image.format || "webp"}` },
    });
  }
  return result.sort((a, b) => a.categorySlotNumber - b.categorySlotNumber || a.sortOrder - b.sortOrder || a.artworkCode!.localeCompare(b.artworkCode!));
}

export function mergeManagedCategoryImages(
  categories: ReadonlyArray<CatalogueCategoryRecord>,
  images: ReadonlyArray<ManagedCatalogueImage>,
): CatalogueCategoryRecord[] {
  return categories.map((category) => {
    const managed = images.filter((image) => image.categorySlug === category.slug).sort((a, b) => a.displayOrder - b.displayOrder);
    if (!managed.length) return category;
    const cover = managed.find((image) => image.active);
    if (!cover) return { ...category, coverImage: null };
    return { ...category, coverImage: { publicId: cover.publicId, secureUrl: cover.secureUrl, resourceType: "image", width: cover.width, height: cover.height, format: cover.format || "webp", altText: cover.altText } };
  });
}

/** Add stable, category-scoped human references to catalogue artworks. */
export function assignArtworkReferenceCodes(
  designs: ReadonlyArray<CatalogueDesignItem>,
): CatalogueDesignItem[] {
  const pad = (value: number) => String(value).padStart(2, "0");
  const reserved = new Set(
    designs.flatMap((design) => design.artworkCode ? [design.artworkCode.trim().toUpperCase()] : []),
  );
  const used = new Set<string>();
  const codeByDesign = new Map<CatalogueDesignItem, string>();
  const nextByCategory = new Map<number, number>();
  const sorted = [...designs].sort((a, b) =>
    a.categorySlotNumber - b.categorySlotNumber ||
    a.id.localeCompare(b.id),
  );

  for (const design of sorted) {
    const existingCode = design.artworkCode?.trim().toUpperCase();
    if (existingCode && !used.has(existingCode)) {
      codeByDesign.set(design, existingCode);
      used.add(existingCode);
      continue;
    }
    let number = nextByCategory.get(design.categorySlotNumber) || 1;
    let code = `AE${pad(design.categorySlotNumber)}-${pad(number)}`;
    while (reserved.has(code) || used.has(code)) {
      number += 1;
      code = `AE${pad(design.categorySlotNumber)}-${pad(number)}`;
    }
    codeByDesign.set(design, code);
    used.add(code);
    reserved.add(code);
    nextByCategory.set(design.categorySlotNumber, number + 1);
  }

  return designs.map((design) => ({
    ...design,
    artworkCode: codeByDesign.get(design),
  }));
}

function makeDriveArtworkMedia(
  category: (typeof DRIVE_CATEGORY_ASSETS)[number],
  image: (typeof category.images)[number],
): MediaAssetRef {
  return {
    publicId: `atelier-wall-story/designs/categories/${category.slug}/${image.code}`,
    secureUrl: image.url,
    resourceType: "image",
    width: image.width,
    height: image.height,
    format: image.format,
    altText: `${category.name}: ${image.title} (${image.code})`,
  };
}

export const DEVELOPMENT_FIXTURE_DESIGNS: ReadonlyArray<CatalogueDesignItem> =
  assignArtworkReferenceCodes(
    PUBLIC_DRIVE_CATEGORY_ASSETS.flatMap((category) =>
      category.images.map((image, index) => {
        const aspect = image.width / image.height;
        const coverImage = makeDriveArtworkMedia(category, image);
        return {
          id: `drive-${category.slug}-${image.code.toLowerCase()}`,
          title: image.title,
          slug: `${category.slug}-${image.code.toLowerCase()}`,
          categoryId: `category-slot-${category.slotNumber}`,
          categorySlug: category.slug,
          categorySlotNumber: category.slotNumber,
          categoryCode: category.slotCode,
          artworkCode: image.code,
          subCategoryLabel: image.subCategory,
          categoryLabel: category.name,
          summary: `${image.code} from the ${category.name} collection.`,
          description: `${image.title} is part of the ${category.name} collection. Share artwork code ${image.code} when enquiring about this design.`,
          tags: [category.slug, category.name.toLowerCase(), image.title.toLowerCase()],
          compatibleSurfaces: ["Walls"],
          dimensionsNote: "Available in custom sizes for your wall.",
          coverImage,
          galleryMedia: [],
          videoAsset: null,
          aspectRatio: aspect > 1.15 ? "landscape" : aspect < 0.87 ? "portrait" : "square",
          featured: index === 0,
          published: true,
          sortOrder: index + 1,
          isDevelopmentFixture: true,
          visualizerConfig: {
            defaultMode: "mural",
            textureUrl: image.url,
            width: image.width,
            height: image.height,
            mimeType: "image/webp",
          },
        } satisfies CatalogueDesignItem;
      }),
    ),
  );

/** One representative Drive artwork per populated category for wall preview. */
export const VISUALIZER_SAMPLE_DESIGNS: ReadonlyArray<CatalogueDesignItem> =
  PUBLIC_DRIVE_CATEGORY_ASSETS.flatMap((category) => {
    const sample = DEVELOPMENT_FIXTURE_DESIGNS.find(
      (design) => design.categorySlotNumber === category.slotNumber,
    );
    return sample ? [sample] : [];
  });


/**
 * Resolves a category record from URL query parameters (`?category=arts-and-entertainment`, `?category=CAT-01`, or `?slot=1`).
 */
export function resolveCategoryFromQuery(params: {
  categoryParam?: string | null;
  slotParam?: string | null;
  categories?: ReadonlyArray<CatalogueCategoryRecord>;
}): CatalogueCategoryRecord | null {
  const rawCategory = params.categoryParam?.trim().toLowerCase();
  if (rawCategory && rawCategory !== "all") {
    const legacySlot = rawCategory.match(/^cat-(\d{1,2})$/u)?.[1];
    const bySlugOrCodeOrName = (params.categories || []).find(
      (cat) =>
        cat.slug.toLowerCase() === rawCategory ||
        cat.slotCode.toLowerCase() === rawCategory ||
        cat.name.toLowerCase() === rawCategory ||
        String(cat.slotNumber) === rawCategory ||
        (legacySlot !== undefined && String(cat.slotNumber) === String(Number(legacySlot)))
    );
    if (bySlugOrCodeOrName) return bySlugOrCodeOrName;
  }

  const slotNum = Number(params.slotParam || "0");
  if (Number.isInteger(slotNum) && slotNum >= 1 && slotNum <= 13) {
    return (
      (params.categories || []).find((cat) => cat.slotNumber === slotNum) ?? null
    );
  }

  return null;
}

/**
 * Looks up a design record by slug, ID, or normalized title slug across the catalogue.
 */
export function findDesignBySlugOrId(
  identifier?: string | null,
  source: ReadonlyArray<CatalogueDesignItem> = []
): CatalogueDesignItem | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  const normalizeSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const cleanSlug = normalizeSlug(clean);
  const cleanWithoutSuffix = cleanSlug.replace(/-wall-mural$/, "");

  return (
    source.find((item) => {
      const titleSlug = normalizeSlug(item.title);
      return (
        item.slug.toLowerCase() === clean ||
        item.id.toLowerCase() === clean ||
        item.artworkCode?.toLowerCase() === clean ||
        item.title.toLowerCase() === clean ||
        titleSlug === cleanSlug ||
        titleSlug === cleanWithoutSuffix ||
        normalizeSlug(item.slug) === cleanSlug
      );
    }) ?? null
  );
}

/**
 * Filters and sorts published designs by category slug, search query, surface filter, and sort order.
 */
export function filterCatalogueDesigns(
  designs: ReadonlyArray<CatalogueDesignItem>,
  options: {
    categorySlug?: string | null;
    searchQuery?: string;
    surfaceFilter?: string | null;
    sortBy?: "latest" | "alphabetical";
  }
): CatalogueDesignItem[] {
  const activeCat = options.categorySlug?.trim().toLowerCase() || "all";
  const query = options.searchQuery?.trim().toLowerCase() || "";
  const surface = options.surfaceFilter?.trim().toLowerCase() || "all";
  const sortBy = options.sortBy || "latest";

  const filtered = designs.filter((item) => {
    if (!item.published) return false;

    const matchesCategory =
      activeCat === "all" ||
      item.categorySlug.toLowerCase() === activeCat ||
      item.categoryCode.toLowerCase() === activeCat ||
      item.categoryLabel.toLowerCase() === activeCat;

    if (!matchesCategory) return false;

    const matchesSurface =
      surface === "all" ||
      item.compatibleSurfaces.some((s) => s.toLowerCase() === surface);

    if (!matchesSurface) return false;

    if (!query) return true;

    const searchableText = [
      item.title,
      item.artworkCode || "",
      item.summary,
      item.description,
      item.categoryLabel,
      item.visualizerConfig.defaultMode,
      ...item.tags,
      ...item.compatibleSurfaces,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  if (sortBy === "alphabetical") {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }

  return [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Editorial Header & Section Configuration for THE ATELIER ART VAULT (Sections 1 & 8).
 */
export const ATELIER_ART_VAULT_CONTENT = {
  eyebrow: "CURATED DESIGN COLLECTION / 01—12",
  vaultLabel: "THE ATELIER ART VAULT",
  headline: "12 Worlds of Wall Art.",
  supportingStatement:
    "Explore an extraordinary collection of expressive surfaces, textures and artistic stories. Find the design that belongs in your space.",
  subheading: "Drag to explore. Discover the details. Find your story.",
} as const;

export interface AtelierVaultCategoryItem {
  id: string;
  slotNumber: number;
  slotCode: string;
  number: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  coverImage: string;
  fallbackImage: string;
  altText: string;
  displayOrder: number;
  published: boolean;
  isConfigured: boolean;
  artworkCount: number;
  compatibleSurfaces: string[];
  featuredDesignSlug: string | null;
}

const DEFAULT_CATEGORY_FALLBACK_IMAGE =
  "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/hero-botanical-living.webp";

/**
 * Adapts canonical source-controlled category records and artwork items into
 * normalized ZoomSlider items for THE ATELIER ART VAULT.
 *
 * Uses the exact same source of truth as the catalogue filters (`DESIGN_CATEGORY_RECORDS`
 * static catalogue configuration. Does not invent fake categories if fewer than 12
 * are configured.
 */
export function buildAtelierVaultCategories(
  categories: ReadonlyArray<CatalogueCategoryRecord> = [],
  designs: ReadonlyArray<CatalogueDesignItem> = []
): AtelierVaultCategoryItem[] {
  const publishedDesigns = designs.filter((d) => d.published);

  return [...categories]
    .filter((cat) => cat.isActive !== false)
    .sort(
      (a, b) =>
        (a.displayOrder ?? a.slotNumber) - (b.displayOrder ?? b.slotNumber)
    )
    .map((cat, idx) => {
      const matchingDesigns = publishedDesigns.filter(
        (d) =>
          d.categorySlug.toLowerCase() === cat.slug.toLowerCase() ||
          d.categoryId === cat.id ||
          d.categorySlotNumber === cat.slotNumber
      );

      const surfaceSet = new Set<string>();
      for (const design of matchingDesigns) {
        for (const s of design.compatibleSurfaces) {
          surfaceSet.add(s);
        }
      }

      const fallbackFromDesign =
        matchingDesigns[0]?.coverImage?.secureUrl ||
        DEFAULT_CATEGORY_FALLBACK_IMAGE;

      const coverUrl =
        cat.coverImage?.secureUrl?.trim() || fallbackFromDesign;

      const slotNumber = cat.slotNumber || idx + 1;
      const numberLabel = String(idx + 1).padStart(2, "0");

      return {
        id: cat.id,
        slotNumber,
        slotCode: cat.slotCode || `CAT-${numberLabel}`,
        number: numberLabel,
        slug: cat.slug,
        title: cat.name,
        shortTitle: cat.shortTitle || cat.name,
        description: cat.description,
        coverImage: coverUrl,
        fallbackImage: fallbackFromDesign,
        altText:
          cat.coverImage?.altText ||
          `${cat.name} wall art collection by Atelier Wall Story`,
        displayOrder: cat.displayOrder ?? slotNumber,
        published: Boolean(cat.isActive),
        isConfigured: Boolean(cat.isConfigured),
        artworkCount: matchingDesigns.length,
        compatibleSurfaces:
          surfaceSet.size > 0 ? Array.from(surfaceSet) : ["Walls"],
        featuredDesignSlug: matchingDesigns[0]?.slug ?? null,
      };
    });
}

