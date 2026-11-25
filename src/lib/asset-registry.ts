/**
 * Centralized Visual Asset Registry for ATELIER — WALL STORY (Section 21 & 23).
 *
 * Tracks curated architectural interior, substrate, before/after comparison,
 * editorial journal, and catalogue artwork visuals across all 20 public routes:
 * - Filename, dimensions & local URL
 * - Intended section (prevents repeating images across unrelated pages)
 * - Asset type, origin & approval status
 * - Accessible alt text, fallback URL & managed placement
 * - Grouped page-level `atelierImages` manifest for structured lookup
 */

export interface AtelierAssetEntry {
  id: string;
  filename: string;
  url: string;
  intendedSection: string;
  width?: number;
  height?: number;
  type:
    | "hero"
    | "category"
    | "artwork"
    | "surface"
    | "comparison"
    | "studio"
    | "project"
    | "journal";
  origin: "atelier_curated_concept" | "design_02_reference" | "brand_supplied";
  licenseOrApproval: string;
  altText: string;
  fallbackUrl: string;
  cmsFieldMapping: string;
}

export const ATELIER_ASSET_REGISTRY = {
  // =========================================================================
  // HOME (/)
  // =========================================================================
  homeHeroPoster: {
    id: "home-hero-poster",
    filename: "atelier-wall-printing-poster.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/images/atelier-wall-printing-poster.webp",
    intendedSection: "Home Hero Video Poster (/)",
    width: 1920,
    height: 1080,
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Home Hero Poster",
    altText:
      "Sunlit luxury interior featuring bespoke direct-to-surface 3D architectural wall printing",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-why-atelier-completed-wall.webp",
    cmsFieldMapping: "page_contents.home.hero.posterUrl",
  },
  homeStudioPhilosophy: {
    id: "home-studio-philosophy",
    filename: "home-studio-philosophy.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-studio-philosophy.webp",
    intendedSection: "Home — The Atelier Philosophy Studio Worktable (/)",
    width: 1200,
    height: 896,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Studio Worktable Visual (No Faces)",
    altText:
      "Sunlit Mumbai architectural atelier worktable arranged with lime-plaster boards, terracotta and travertine tiles, birch plywood, brushed bronze plates, fluted glass swatches, brass callipers, and an open mural sketchbook",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-walls.webp",
    cmsFieldMapping: "page_contents.home.philosophy.visualPlaceholderUrl",
  },
  homePrintingTechnologyCloseup: {
    id: "home-printing-technology-closeup",
    filename: "home-printing-technology-closeup.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-printing-technology-closeup.webp",
    intendedSection: "Home — The Art of Wall Printing Technology Spread (/)",
    width: 1376,
    height: 768,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Vertical Printer Visual",
    altText:
      "Vertical direct-to-wall 3D printer mid-print laying a sage botanical mural onto a primed interior plaster wall",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-3d-wall-printing.webp",
    cmsFieldMapping: "page_contents.home.wallPrintingArt.imageUrl",
  },
  homeExecutedResidentialMural: {
    id: "home-executed-residential-mural",
    filename: "home-executed-residential-mural.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-executed-residential-mural.webp",
    intendedSection: "Home — Selected Projects Wide Residential Feature (/)",
    width: 1376,
    height: 768,
    type: "project",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Residential Feature Visual",
    altText:
      "Double-height villa stair hall with a banyan root and leaf mural printed directly onto warm lime plaster",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/walls-lotus-residence-cover.webp",
    cmsFieldMapping: "page_contents.home.selectedProjects.slot01ImageUrl",
  },
  homeExecutedGlassPartition: {
    id: "home-executed-glass-partition",
    filename: "home-executed-glass-partition.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-executed-glass-partition.webp",
    intendedSection: "Home — Selected Projects Multi-Surface Glazing Feature (/)",
    width: 1376,
    height: 768,
    type: "project",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Glazing Feature Visual",
    altText:
      "Hotel lobby glass partition printed with a translucent burgundy and gold architectural jaali lattice",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/glass-partition-cover.webp",
    cmsFieldMapping: "page_contents.home.selectedProjects.slot02ImageUrl",
  },
  homeWhyAtelierCompletedWall: {
    id: "home-why-atelier-completed-wall",
    filename: "home-why-atelier-completed-wall.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-why-atelier-completed-wall.webp",
    intendedSection: "Home — Why Atelier Completed Living Room Feature (/)",
    width: 1376,
    height: 768,
    type: "project",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Why Atelier Visual",
    altText:
      "Calm Mumbai residence living room featuring a seamless arch and palm shadow mural printed directly onto the plaster wall",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-executed-residential-mural.webp",
    cmsFieldMapping: "page_contents.home.whyAtelier.imageUrl",
  },

  // =========================================================================
  // EXPLORE DESIGNS (/explore-designs) & CATALOGUE ARTWORKS
  // =========================================================================
  exploreHeroCuratedGallery: {
    id: "explore-hero-curated-gallery",
    filename: "explore-hero-curated-gallery.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-hero-curated-gallery.webp",
    intendedSection: "Explore Designs Hero (/explore-designs)",
    width: 1200,
    height: 896,
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Explore Designs Gallery Hero",
    altText:
      "Sunlit curated architectural gallery interior showcasing framed bespoke wall mural studies, plaster arches, and travertine plinths",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/hero-botanical-living.webp",
    cmsFieldMapping: "page_contents.explore-designs.hero.posterImage",
  },
  exploreHeroBotanical: {
    id: "explore-hero-botanical",
    filename: "hero-botanical-living.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/hero-botanical-living.webp",
    intendedSection: "Legacy Explore Designs Fallback Visual",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Design 02 Hero Concept Visual",
    altText:
      "Sunlit luxury contemporary living room featuring a bespoke botanical wall mural above a curved cream sofa and travertine coffee table",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/ref-hero-botanical.webp",
    cmsFieldMapping: "page_contents.explore-designs.hero.fallbackPosterImage",
  },
  exploreSeeItBefore: {
    id: "explore-see-it-before",
    filename: "explore-see-it-before.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-before.webp",
    intendedSection: "Explore Designs & Services — See It Before We Print It (Before)",
    width: 1200,
    height: 896,
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Pixel-Matched Bedroom Before Visual",
    altText:
      "Before — sunlit serene cream bedroom with upholstered linen headboard and bare architectural plaster wall prior to printing",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-before.webp",
    cmsFieldMapping: "page_contents.explore-designs.comparison.beforeImage",
  },
  exploreSeeItAfterLotus: {
    id: "explore-see-it-after-lotus",
    filename: "explore-see-it-after-lotus.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-after-lotus.webp",
    intendedSection: "Explore Designs & Services — See It Before We Print It (Lotus Preset)",
    width: 1200,
    height: 896,
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Pixel-Matched Bedroom After Visual",
    altText:
      "After — the identical sunlit cream bedroom transformed with a bespoke blush lotus and sage botanical mural behind the headboard",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-after.webp",
    cmsFieldMapping: "page_contents.explore-designs.comparison.afterLotus",
  },
  exploreSeeItAfterBotanical: {
    id: "explore-see-it-after-botanical",
    filename: "explore-see-it-after-botanical.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-after-botanical.webp",
    intendedSection: "Explore Designs & Services — See It Before We Print It (Botanical Preset)",
    width: 1200,
    height: 896,
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Pixel-Matched Bedroom After Visual",
    altText:
      "After — the identical sunlit cream bedroom transformed with a layered tropical botanical canopy mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-after.webp",
    cmsFieldMapping: "page_contents.explore-designs.comparison.afterBotanical",
  },
  exploreSeeItAfterTerracotta: {
    id: "explore-see-it-after-terracotta",
    filename: "explore-see-it-after-terracotta.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-after-terracotta.webp",
    intendedSection: "Explore Designs & Services — See It Before We Print It (Terracotta Preset)",
    width: 1200,
    height: 896,
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Pixel-Matched Bedroom After Visual",
    altText:
      "After — the identical sunlit cream bedroom transformed with a sculpted terracotta and ochre architectural arch mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-matched-after.webp",
    cmsFieldMapping: "page_contents.explore-designs.comparison.afterTerracotta",
  },
  artworkTerracottaWave: {
    id: "artwork-terracotta-wave",
    filename: "artwork-terracotta-wave.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-terracotta-wave.webp",
    intendedSection: "Artwork Catalogue — Textured Category Cover & Terracotta Wave Relief",
    type: "artwork",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Catalogue Concept Visual",
    altText:
      "Terracotta Wave Relief — organic terracotta and warm sand wave wall mural in a minimalist living room",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/card-01-terracotta-wave.webp",
    cmsFieldMapping: "designs.primaryImage",
  },
  artworkBotanicalCanopy: {
    id: "artwork-botanical-canopy",
    filename: "artwork-botanical-canopy.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-botanical-canopy.webp",
    intendedSection: "Artwork Catalogue — Botanical Category Cover & Botanical Canopy",
    type: "artwork",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Catalogue Concept Visual",
    altText:
      "Botanical Canopy — overhanging leafy botanical mural on a warm cream dining room wall",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/card-02-botanical-canopy.webp",
    cmsFieldMapping: "designs.primaryImage",
  },
  artworkArchLimestone: {
    id: "artwork-arch-limestone",
    filename: "artwork-arch-limestone.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-arch-limestone.webp",
    intendedSection: "Artwork Catalogue — Architectural Category Cover & Arch Series Limestone",
    type: "artwork",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Catalogue Concept Visual",
    altText:
      "Arch Series – Limestone — 3D perspective fluted limestone arch mural in a sunlit living room",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/card-03-arch-limestone.webp",
    cmsFieldMapping: "designs.primaryImage",
  },
  artworkMountainSilhouette: {
    id: "artwork-mountain-silhouette",
    filename: "artwork-mountain-silhouette.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-mountain-silhouette.webp",
    intendedSection: "Artwork Catalogue — Landscapes Category Cover & Mountain Silhouette",
    type: "artwork",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Catalogue Concept Visual",
    altText:
      "Mountain Silhouette — layered misty mountain horizon mural behind a modern linen sofa",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/card-04-mountain-silhouette.webp",
    cmsFieldMapping: "designs.primaryImage",
  },
  artworkLotusAtelier: {
    id: "artwork-lotus-atelier",
    filename: "artwork-lotus-atelier.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-lotus-atelier.webp",
    intendedSection: "Artwork Catalogue — Floral Studies Category Cover & Lotus Atelier Study",
    type: "artwork",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Catalogue Concept Visual",
    altText:
      "Lotus Atelier Study — delicate blush lotus and sage botanical mural in a refined living room",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/card-05-lotus-atelier.webp",
    cmsFieldMapping: "designs.primaryImage",
  },
  artworkGeometricHarmony: {
    id: "artwork-geometric-harmony",
    filename: "artwork-geometric-harmony.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-geometric-harmony.webp",
    intendedSection: "Artwork Catalogue — Geometric Category Cover & Geometric Harmony",
    type: "artwork",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Catalogue Concept Visual",
    altText:
      "Geometric Harmony — terracotta, rust, and warm sand geometric arch mural with natural window shadows",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/card-06-geometric-harmony.webp",
    cmsFieldMapping: "designs.primaryImage",
  },
  catSienaAbstractHorizon: {
    id: "cat-siena-abstract-horizon",
    filename: "siena-abstract-horizon.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/abstract/siena-abstract-horizon.webp",
    intendedSection: "Artwork Catalogue — Abstract Category Cover & Siena Abstract Horizon",
    width: 1376,
    height: 768,
    type: "category",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Abstract Category Visual",
    altText:
      "Siena Abstract Horizon — layered burnt-siena, ochre, and warm cream abstract horizon mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-geometric-harmony.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },
  catTexturedPlaster: {
    id: "cat-textured-plaster",
    filename: "cat-textured-plaster.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/cat-textured-plaster.webp",
    intendedSection: "Artwork Catalogue — Plaster & Lime Category Cover",
    type: "category",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Material Study Visual",
    altText:
      "Sculpted warm beige lime-plaster wall texture with soft raking daylight",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/cat-03-textured.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },
  catMineralTravertine: {
    id: "cat-mineral-travertine",
    filename: "cat-mineral-travertine.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/cat-mineral-travertine.webp",
    intendedSection: "Artwork Catalogue — Mineral Category Cover",
    type: "category",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Material Study Visual",
    altText:
      "Warm beige travertine stone strata with delicate diagonal mineral veining",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/cat-05-mineral.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },
  surfaceTilesInterior: {
    id: "surface-tiles-interior",
    filename: "surface-tiles-interior.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/surface-tiles-interior.webp",
    intendedSection: "Artwork Catalogue — Tile Editions Category Cover",
    type: "surface",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Surface Concept Visual",
    altText:
      "Custom terracotta and botanical artwork printed directly across large-format ceramic wall tiles",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/samples/service-03-tile-printing.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },
  surfaceGlassInterior: {
    id: "surface-glass-interior",
    filename: "surface-glass-interior.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/surface-glass-interior.webp",
    intendedSection: "Artwork Catalogue — Glass & Glazing Category Cover",
    type: "surface",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Surface Concept Visual",
    altText:
      "Sunlit studio with black-framed glass partition walls printed with frosted botanical privacy art",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/samples/service-04-glass-printing.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },
  surfacePlywoodMetalInterior: {
    id: "surface-plywood-metal-interior",
    filename: "surface-plywood-metal-interior.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/surface-plywood-metal-interior.webp",
    intendedSection: "Artwork Catalogue — Timber & Metal Category Cover",
    type: "surface",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Surface Concept Visual",
    altText:
      "Warm birch plywood and brushed bronze-metal panels printed with minimalist geometric arch artwork",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/samples/service-05-plywood-metal-printing.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },
  surfaceOfficeBlindsInterior: {
    id: "surface-office-blinds-interior",
    filename: "surface-office-blinds-interior.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/surface-office-blinds-interior.webp",
    intendedSection: "Artwork Catalogue — Window & Blinds Category Cover",
    type: "surface",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Surface Concept Visual",
    altText:
      "Executive boardroom windows fitted with custom-printed roller blinds showing a continuous mountain horizon mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/samples/service-06-office-blind-printing.webp",
    cmsFieldMapping: "design_categories.coverImage",
  },

  // =========================================================================
  // ABOUT US (/about)
  // =========================================================================
  wallPreviewBefore: {
    id: "wall-preview-before",
    filename: "wall-preview-before.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-before.webp",
    intendedSection: "About Us — Spatial Harmony Bare Architectural Wall (Before)",
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Wall Comparison Concept Visual",
    altText:
      "Before — sunlit warm neutral living room wall with potted olive tree prior to mural printing",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-before-scene.webp",
    cmsFieldMapping: "page_contents.about.spatialHarmony.beforeImage",
  },
  aboutHarmonyBotanicalAfter: {
    id: "about-harmony-botanical-after",
    filename: "about-harmony-botanical-after.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-harmony-botanical-after.webp",
    intendedSection: "About Us — Spatial Harmony Proportioned Mural Preview (After)",
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Spatial Harmony After Visual",
    altText:
      "After — the same sunlit architectural living room wall transformed with a proportioned botanical mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-after.webp",
    cmsFieldMapping: "page_contents.about.spatialHarmony.afterImage",
  },
  wallPreviewAfter: {
    id: "wall-preview-after",
    filename: "wall-preview-after.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-after.webp",
    intendedSection: "Legacy Comparison Fallback Visual",
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Wall Comparison Concept Visual",
    altText:
      "After — sunlit architectural wall transformed with a bespoke botanical mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-after-scene.webp",
    cmsFieldMapping: "page_contents.visualizer.afterImage",
  },
  wallPreviewMatchedAfter: {
    id: "wall-preview-matched-after",
    filename: "wall-preview-matched-after.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-matched-after.webp",
    intendedSection: "Legacy Comparison Matched Fallback Visual",
    type: "comparison",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Pixel-Matched Wall Comparison Study",
    altText:
      "After — sunlit architectural plaster wall transformed with a custom terracotta and ochre geometric arch mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-after.webp",
    cmsFieldMapping: "page_contents.explore-designs.comparison.afterImage",
  },
  studioAboutInterior: {
    id: "studio-about-interior",
    filename: "home-studio-philosophy.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-studio-philosophy.webp",
    intendedSection: "Studio Worktable Fallback Reference (No Faces)",
    width: 1200,
    height: 896,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Studio Concept Visual",
    altText:
      "Sunlit architectural design atelier table with travertine, tile, and timber samples alongside mural studies",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-mumbai-studio-concept.webp",
    cmsFieldMapping: "page_contents.about.hero.fallbackImage",
  },
  aboutHeroLotusArch: {
    id: "about-hero-lotus-arch",
    filename: "about-hero-crane-dining.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-hero-crane-dining.webp",
    intendedSection: "About Us Hero — Architectural Crane & Dining Scene (/about)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER About Design 02 Hero Visual",
    altText:
      "Sunlit architectural interior featuring a bespoke crane and botanical mural framed by warm Venetian plaster",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-mumbai-studio-concept.webp",
    cmsFieldMapping: "page_contents.about.hero.heroImageUrl",
  },
  aboutStoryArchVase: {
    id: "about-story-arch-vase",
    filename: "about-story-sculptural-arch.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-story-sculptural-arch.webp",
    intendedSection: "About Us — Sculptural Studio Story Arch (/about)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER About Design 02 Studio Visual",
    altText:
      "Sunlit sculptural cream plaster archway with recessed floor lighting and a handcrafted ceramic vase holding dried botanical branches",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-mumbai-studio-concept.webp",
    cmsFieldMapping: "page_contents.about.studioStory.archVisualUrl",
  },
  aboutStorySketchbook: {
    id: "about-story-sketchbook",
    filename: "about-story-sketchbook.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-story-sketchbook.webp",
    intendedSection: "About Us — Studio Story Sketchbook (/about)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER About Design 02 Sketchbook Visual",
    altText:
      "Open linen-bound artist sketchbook on honed travertine showing a graphite lotus drawing on the left page and warm terracotta pigment waves on the right page",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-01-consultation.webp",
    cmsFieldMapping: "page_contents.about.studioStory.sketchbookVisualUrl",
  },
  aboutPersonSaikatRay: {
    id: "about-person-saikat-ray",
    filename: "about-person-saikat-ray-portrait.webp",
    url: "/images/atelier/about/about-person-saikat-ray-portrait.webp",
    intendedSection: "About Us — The People Behind ATELIER (Saikat Ray)",
    width: 1200,
    height: 900,
    type: "studio",
    origin: "brand_supplied",
    licenseOrApproval: "User-supplied portrait retouched for the ATELIER About page",
    altText:
      "Saikat Ray, Managing Director at ATELIER — WALL STORY, in a navy polo against a warm studio backdrop",
    fallbackUrl: "/images/atelier/about/about-person-saikat-ray-portrait.webp",
    cmsFieldMapping: "page_contents.about.peopleBehindStudio.representativeWorkspaces[0].imageUrl",
  },
  aboutPersonTriparnaBardhan: {
    id: "about-person-triparna-bardhan",
    filename: "about-person-triparna-bardhan-portrait.webp",
    url: "/images/atelier/about/about-person-triparna-bardhan-portrait.webp",
    intendedSection: "About Us — The People Behind ATELIER (Triparna Bardhan)",
    width: 1200,
    height: 900,
    type: "studio",
    origin: "brand_supplied",
    licenseOrApproval: "User-supplied portrait retouched for the ATELIER About page",
    altText:
      "Triparna Bardhan, Managing Director at ATELIER — WALL STORY, in a maroon top against a warm studio backdrop",
    fallbackUrl: "/images/atelier/about/about-person-triparna-bardhan-portrait.webp",
    cmsFieldMapping: "page_contents.about.peopleBehindStudio.representativeWorkspaces[1].imageUrl",
  },

  // =========================================================================
  // OUR PROJECTS (/projects & /projects/[slug])
  // =========================================================================
  projectHeroCraneLiving: {
    id: "project-hero-crane-living",
    filename: "project-hero-crane-living.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/project-hero-crane-living.webp",
    intendedSection: "Our Projects Hero Slide 01 — Japanese Crane Residence (/projects)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Architectural Portfolio Study Visual",
    altText:
      "Luxury living room featuring a custom 3D printed Japanese crane, cherry blossom, and crimson sun mural on warm plaster",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/walls-lotus-residence-cover.webp",
    cmsFieldMapping: "page_contents.projects.hero.slides[0]",
  },
  projectRetailTerracottaArch: {
    id: "project-retail-terracotta-arch",
    filename: "project-retail-terracotta-arch.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/project-retail-terracotta-arch.webp",
    intendedSection: "Our Projects Hero Slide 02 — Retail Terracotta Relief (/projects)",
    type: "project",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Architectural Portfolio Study Visual",
    altText:
      "Luxury retail boutique and hospitality lounge with a 3D printed terracotta arch and wave relief mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/plywood-retail-cover.webp",
    cmsFieldMapping: "page_contents.projects.hero.slides[1]",
  },
  projectBoardroomReliefWall: {
    id: "project-boardroom-relief-wall",
    filename: "project-boardroom-relief-wall.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/project-boardroom-relief-wall.webp",
    intendedSection: "Our Projects Hero Slide 03 — Executive Boardroom (/projects)",
    type: "project",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Architectural Portfolio Study Visual",
    altText:
      "Executive boardroom featuring a backlit sand-dune horizon wall mural and tailored seating",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/blinds-office-cover.webp",
    cmsFieldMapping: "page_contents.projects.hero.slides[2]",
  },
  projectHeroMediterraneanTile: {
    id: "project-hero-mediterranean-tile",
    filename: "hero-mediterranean-tile-hospitality.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/hero-mediterranean-tile-hospitality.webp",
    intendedSection: "Our Projects Hero Slide 04 — Mediterranean Tile Hospitality (/projects)",
    width: 1376,
    height: 768,
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Architectural Portfolio Study Visual",
    altText:
      "Sunlit Mediterranean hospitality dining room with terracotta and olive botanical arches printed across large-format ceramic tiles",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/tiles-hospitality-cover.webp",
    cmsFieldMapping: "page_contents.projects.hero.slides[3]",
  },
  surfaceMetalsBrushedBronze: {
    id: "surface-metals-brushed-bronze",
    filename: "surface-metals-brushed-bronze.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/surface-metals-brushed-bronze.webp",
    intendedSection: "Legacy Brushed Metal Fallback Reference",
    type: "surface",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Surface Concept Visual",
    altText:
      "Brushed warm bronze and champagne-gold metallic cladding panel with precision-printed geometric line art",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/metals-lobby-cover.webp",
    cmsFieldMapping: "projects.metals.fallbackImage",
  },

  // =========================================================================
  // SERVICES (/services)
  // =========================================================================
  servicesLivingCanvasHero: {
    id: "services-living-canvas-hero",
    filename: "services-living-canvas-hero.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/services-living-canvas-hero.webp",
    intendedSection: "Services Hero — Turn Any Surface into a Living Canvas (/services)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Services Hero Visual",
    altText:
      "Sunlit luxury architectural living space with bespoke botanical wall art framed by sculpted plaster",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/services-hero-sculptural-lotus.webp",
    cmsFieldMapping: "page_contents.services.hero.heroImageUrl",
  },
  servicesHeroSculpturalLotus: {
    id: "services-hero-sculptural-lotus",
    filename: "services-hero-sculptural-lotus.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/services-hero-sculptural-lotus.webp",
    intendedSection: "Services Hero Fallback Visual (/services)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER 3D Architectural Services Visual",
    altText:
      "Sculptural curved lime-plaster oval arch framing a luxury living room with a bespoke blush lotus and sage botanical mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-lotus-atelier.webp",
    cmsFieldMapping: "page_contents.services.hero.posterImage",
  },
  servicesSpiralStaircase: {
    id: "services-spiral-staircase",
    filename: "services-spiral-staircase.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/services-spiral-staircase.webp",
    intendedSection: "Services — Architectural Spiral Process Fallback (/services)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER 3D Architectural Services Visual",
    altText:
      "Sculptural curved travertine and warm plaster spiral staircase with warm recessed LED step illumination and botanical wall relief",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-studio-philosophy.webp",
    cmsFieldMapping: "page_contents.services.howItWorks.stageImage",
  },

  // =========================================================================
  // OUR PROCESS (/process)
  // =========================================================================
  processHeroSculpturalArch: {
    id: "process-hero-sculptural-arch",
    filename: "process-hero-sculptural-arch.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-hero-sculptural-arch.webp",
    intendedSection: "Our Process Hero Fallback (/process)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Architectural Journey Visual",
    altText:
      "Sweeping curved lime-plaster archway with recessed golden LED lighting framing a sunlit living room with a bespoke terracotta and sage botanical mural",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/services-hero-sculptural-lotus.webp",
    cmsFieldMapping: "page_contents.process.hero.fallbackImageUrl",
  },
  processHeroIdeaToWall: {
    id: "process-hero-living-arch",
    filename: "process-hero-living-arch.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-hero-living-arch.webp",
    intendedSection: "Our Process Hero — From Idea to Wall Sculptural Archway (/process)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Luxury Architectural Hero Visual",
    altText:
      "Sunlit luxury living room framed by a complete Venetian plaster archway featuring a bespoke terracotta, warm ochre, and muted olive botanical arch mural behind a curved cream bouclé sofa and travertine coffee table",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-hero-sculptural-arch.webp",
    cmsFieldMapping: "page_contents.process.hero.posterImage",
  },
  processStage01Consultation: {
    id: "process-stage-01-consultation",
    filename: "process-stage-01-consultation.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-01-consultation.webp",
    intendedSection: "Our Process — Stage 01 Consultation (/process)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Stage 01 Visual",
    altText:
      "Architectural studio consultation table with linen sketchbook, travertine and ceramic tile swatches, birch plywood blocks, and warm brass lamp",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-studio-philosophy.webp",
    cmsFieldMapping: "page_contents.process.stages[0].imageUrl",
  },
  processStage02Exploration: {
    id: "process-stage-02-design-exploration",
    filename: "process-stage-02-design-exploration.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-02-design-exploration.webp",
    intendedSection: "Our Process — Stage 02 Design Exploration (/process)",
    width: 1200,
    height: 896,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Stage 02 Visual",
    altText:
      "Curated wall-mural design boards, botanical mood studies, and terracotta color chips pinned across a sunlit linen presentation rail",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-01-consultation.webp",
    cmsFieldMapping: "page_contents.process.stages[1].imageUrl",
  },
  processStage03Customization: {
    id: "process-stage-03-customization",
    filename: "process-stage-03-customization.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-03-customization.webp",
    intendedSection: "Our Process — Stage 03 Material & Scale Customization (/process)",
    width: 1200,
    height: 896,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Stage 03 Visual",
    altText:
      "Scaled architectural wall elevation blueprint beside UV-printed tile, birch plywood, brushed metal, and frosted glass test proofs",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-04-approval.webp",
    cmsFieldMapping: "page_contents.process.stages[2].imageUrl",
  },
  processStage04Approval: {
    id: "process-stage-04-approval",
    filename: "process-stage-04-approval.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-04-approval.webp",
    intendedSection: "Our Process — Stage 04 Design Approval (/process)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Stage 04 Visual",
    altText:
      "Architectural design approval flat-lay on honed travertine desk with mural elevation proof sheet, pigment swatches, and brass scale ruler",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-arch-limestone.webp",
    cmsFieldMapping: "page_contents.process.stages[3].imageUrl",
  },
  processStage05Execution: {
    id: "process-stage-05-execution",
    filename: "process-stage-05-execution.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-05-execution.webp",
    intendedSection: "Our Process — Stage 05 Printing & Installation (/process)",
    type: "project",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Stage 05 Visual",
    altText:
      "Double-height sunlit architectural sanctuary featuring a completed direct-to-wall 3D relief mural of organic sandstone arches and botanical foliage",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-terracotta-wave.webp",
    cmsFieldMapping: "page_contents.process.stages[4].imageUrl",
  },
  processBriefChecklist: {
    id: "process-brief-checklist",
    filename: "process-brief-checklist.webp",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-brief-checklist.webp",
    intendedSection: "Our Process — What Helps Us Begin Project Brief Checklist (/process)",
    width: 1200,
    height: 896,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Process Brief Flat-Lay Visual",
    altText:
      "Architect's brass tape measure, room wall photograph, plaster and tile samples, and project brief notebook on honed travertine",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-01-consultation.webp",
    cmsFieldMapping: "page_contents.process.briefChecklist.imageUrl",
  },

  // =========================================================================
  // JOURNAL (/blogs & /blogs/[slug])
  // =========================================================================
  journalHeroBurgundyAlcove: {
    id: "journal-hero-burgundy-alcove",
    filename: "journal-hero-burgundy-alcove.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal-hero-burgundy-alcove.webp",
    intendedSection: "Journal Hero — Sculptural Burgundy Alcove (/blogs)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Journal Sculptural Hero Visual",
    altText:
      "Sculptural curved ivory plaster wall opening into a deep burgundy arched alcove with diagonal sunlight shadows and a ceramic vase of dried blush blossoms on a travertine plinth",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-story-sculptural-arch.webp",
    cmsFieldMapping: "page_contents.blogs.hero.heroImageUrl",
  },
  journalDividerStillLife: {
    id: "journal-divider-still-life",
    filename: "journal-divider-still-life.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal-divider-still-life.webp",
    intendedSection: "Journal — Sculptural Editorial Divider Still Life (/blogs)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Journal Editorial Divider Visual",
    altText:
      "Round honed travertine pedestal table with two stacked linen design books, a warm brushed-brass dome lamp, and dried botanical twigs",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-studio-philosophy.webp",
    cmsFieldMapping: "page_contents.blogs.editorialDivider.imageUrl",
  },

  // =========================================================================
  // WALL VISUALIZER (/visualizer)
  // =========================================================================
  visualizerHeroBurgundyAlcove: {
    id: "visualizer-hero-burgundy-alcove",
    filename: "visualizer-hero-burgundy-alcove.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/visualizer-hero-burgundy-alcove.webp",
    intendedSection: "Wall Visualizer Hero — Sculptural Plaster Arch & Burgundy Alcove (/visualizer)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Wall Visualizer Sculptural Hero Visual",
    altText:
      "Sculptural warm cream Venetian plaster wall with palm leaf morning shadows curving into a deep burgundy arched alcove with a ceramic vase of dried golden blossoms on a travertine plinth",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal-hero-burgundy-alcove.webp",
    cmsFieldMapping: "page_contents.visualizer.hero.heroImageUrl",
  },

  // =========================================================================
  // CONTACT US (/contact)
  // =========================================================================
  contactStudioDiningMural: {
    id: "contact-studio-dining-mural",
    filename: "contact-studio-dining-mural.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/contact/contact-studio-dining-mural.webp",
    intendedSection: "Contact Us — Architectural Studio & Dining Mural Feature (/contact)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Contact Us Architectural Feature Visual",
    altText:
      "Sunlit architectural consultation and dining room featuring a bespoke lotus botanical wall mural inside a backlit plaster arch beside floor-to-ceiling windows and fluted oak panelling",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-mumbai-studio-concept.webp",
    cmsFieldMapping: "page_contents.contact.featureImageUrl",
  },
  contactHeroLotusArch: {
    id: "contact-hero-lotus-arch",
    filename: "contact-hero-lotus-arch.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/contact/contact-hero-lotus-arch.webp",
    intendedSection: "Contact Us Hero — Sculptural Plaster Arch & Lotus Mural (/contact)",
    type: "hero",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Contact Us Luxury Architectural Hero Visual",
    altText:
      "Sunlit ivory architectural interior featuring a recessed Venetian plaster arch with a blush-terracotta lotus botanical mural, travertine plinth with berry vase, and tall black-framed arched garden window",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-mumbai-studio-concept.webp",
    cmsFieldMapping: "page_contents.contact.hero.posterImage",
  },
  contactLocationArchPlant: {
    id: "contact-location-arch-plant",
    filename: "contact-location-arch-plant.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/contact/contact-location-arch-plant.webp",
    intendedSection: "Contact Us — Mumbai Studio Location Arch Detail (/contact)",
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Contact Us Studio Location Accent Visual",
    altText:
      "Warm cove-lit Venetian plaster arch alcove with a trailing green botanical plant in a calm ivory architectural corner",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-philosophy-arch-alcove.webp",
    cmsFieldMapping: "page_contents.contact.locationImageUrl",
  },
  adminLoginStudioArch: {
    id: "admin-login-studio-arch",
    filename: "admin-login-studio-arch.jpg",
    url: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/admin-login-studio-arch.webp",
    intendedSection: "Admin Studio Login Split-Screen Hero (/admin/login)",
    width: 896,
    height: 1200,
    type: "studio",
    origin: "atelier_curated_concept",
    licenseOrApproval: "Approved ATELIER Admin Studio Architectural Feature Visual",
    altText:
      "Sunlit cream Venetian plaster arch alcove framing a hand-painted botanical mineral wall mural with warm terracotta and sage leaves over a travertine plinth",
    fallbackUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-philosophy-arch-alcove.webp",
    cmsFieldMapping: "admin.login.heroImageUrl",
  },
} as const satisfies Record<string, AtelierAssetEntry>;

/**
 * Page-scoped manifest of all 88 newly generated & WebP-optimized assets
 * across ATELIER — WALL STORY (`public/images/atelier/**`).
 */
export const atelierImages = {
  home: {
    studioPhilosophy: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-studio-philosophy.webp",
    philosophySurfaces: {
      walls: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-walls.webp",
      tiles: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-tiles.webp",
      plywood: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-plywood.webp",
      officeBlinds: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-blinds.webp",
      metals: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-metals.webp",
      glass: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-philosophy-glass.webp",
    },
    scrollExperience: {
      wallPrinting: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-3d-wall-printing.webp",
      customMurals: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-custom-murals.webp",
      tilePrinting: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-tile-printing.webp",
      glassPrinting: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-glass-printing.webp",
      plywoodMetalPrinting:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-plywood-metal-printing.webp",
      officeBlindPrinting:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-scroll-office-blind-printing.webp",
    },
    substrates: {
      walls: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-substrate-walls.webp",
      tiles: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-substrate-tiles.webp",
      plywood: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-substrate-plywood.webp",
      officeBlinds: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-substrate-blinds.webp",
      metals: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-substrate-metals.webp",
      glass: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-substrate-glass.webp",
    },
    printingTechnologyCloseup:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-printing-technology-closeup.webp",
    executedResidentialMural:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-executed-residential-mural.webp",
    executedGlassPartition:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-executed-glass-partition.webp",
    whyAtelierCompletedWall:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/home/home-why-atelier-completed-wall.webp",
  },
  exploreDesigns: {
    hero: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-hero-curated-gallery.webp",
    seeItBefore: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-before.webp",
    seeItAfterLotus:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-after-lotus.webp",
    seeItAfterBotanical:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-after-botanical.webp",
    seeItAfterTerracotta:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/explore-see-it-after-terracotta.webp",
    generatedArtworks: {
      sienaAbstractHorizon:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/abstract/siena-abstract-horizon.webp",
      crimsonAlcoveOchreStudy:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/abstract/crimson-alcove-ochre-study.webp",
      galleryTonalPlanesStudy:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/abstract/gallery-tonal-planes-study.webp",
      sculptedDuneOchreRelief:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/textured/sculpted-dune-ochre-relief.webp",
      rawTravertinePlasterRibbons:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/textured/raw-travertine-plaster-ribbons.webp",
      romanVeinCutAlabaster:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/mineral/roman-vein-cut-alabaster.webp",
      rawUmberSandstoneQuarry:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/mineral/raw-umber-sandstone-quarry.webp",
      pressedHerbariumLinenStudy:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/floral-studies/pressed-herbarium-linen-study.webp",
      venetianMarmorinoWarmSand:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/plaster-lime/venetian-marmorino-warm-sand.webp",
      burgundyLimeAlcovePatina:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/plaster-lime/burgundy-lime-alcove-patina.webp",
      amalfiTerracottaTileArch:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/tile-editions/amalfi-terracotta-tile-arch.webp",
      travertineLotusTileEdition:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/tile-editions/travertine-lotus-tile-edition.webp",
      flutedReedLinenGlassScreen:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/glass-glazing/fluted-reed-linen-glass-screen.webp",
      translucentLotusGlazingMural:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/glass-glazing/translucent-lotus-glazing-mural.webp",
      nordicBirchTerracottaMillwork:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/timber-metal/nordic-birch-terracotta-millwork.webp",
      botanicalSolarScreenBlind:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/window-blinds/botanical-solar-screen-blind.webp",
      architecturalArchBlindTriptych:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/window-blinds/architectural-arch-blind-triptych.webp",
      kyotoCraneCrimsonSun:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/landscapes/kyoto-crane-crimson-sun.webp",
      backlitDuneValleyHorizon:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/explore-designs/landscapes/backlit-dune-valley-horizon.webp",
    },
  },
  projects: {
    heroMediterraneanTile:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/hero-mediterranean-tile-hospitality.webp",
    studies: {
      walls: {
        cover: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/walls-lotus-residence-cover.webp",
        detail: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/walls-lotus-residence-detail.webp",
        before: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/walls-lotus-residence-before.webp",
      },
      tiles: {
        cover: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/tiles-hospitality-cover.webp",
        detail: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/tiles-hospitality-detail.webp",
        before: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/tiles-hospitality-before.webp",
      },
      plywood: {
        cover: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/plywood-retail-cover.webp",
        detail: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/plywood-retail-detail.webp",
        before: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/plywood-retail-before.webp",
      },
      officeBlinds: {
        cover: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/blinds-office-cover.webp",
        detail: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/blinds-office-detail.webp",
        before: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/blinds-office-before.webp",
      },
      metals: {
        cover: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/metals-lobby-cover.webp",
        detail: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/metals-lobby-detail.webp",
        before: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/metals-lobby-before.webp",
      },
      glass: {
        cover: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/glass-partition-cover.webp",
        detail: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/glass-partition-detail.webp",
        before: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/projects/glass-partition-before.webp",
      },
    },
  },
  services: {
    materialCloseups: {
      tiles: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-material-tiles-closeup.webp",
      officeBlinds:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-material-blinds-closeup.webp",
      metals: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-material-metals-closeup.webp",
      glass: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-material-glass-closeup.webp",
    },
    realSpaces: {
      lotusResidence:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-real-lotus-residence.webp",
      creativeOffice:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-real-creative-office.webp",
      cafeTerra: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-real-cafe-terra.webp",
      terracottaBoutique:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-real-terracotta-boutique.webp",
      executiveBoardroom:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/services/services-real-executive-boardroom.webp",
    },
  },
  process: {
    stage02Exploration:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-02-design-exploration.webp",
    stage03Customization:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-03-customization.webp",
    briefChecklist: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-brief-checklist.webp",
  },
  journal: {
    covers: {
      directToSurfacePrinting:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-direct-to-surface-printing-cover.webp",
      sixSurfaces: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-six-surfaces-cover.webp",
      muralsVsPatterns:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-murals-vs-patterns-cover.webp",
      expressiveWorkspaces:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-expressive-workspaces-cover.webp",
      catalogueVisualizer:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-catalogue-visualizer-cover.webp",
    },
    inlineFigures: {
      seamlessWallDetail:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-seamless-wall-detail.webp",
      surfaceContinuity:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-surface-continuity.webp",
    },
  },
  visualizer: {
    heroLimestoneSet:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/visualizer-hero-limestone-set.webp",
    sampleRooms: {
      neutralLiving:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/visualizer-room-neutral-living.webp",
      angledGallery:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/visualizer-room-angled-gallery.webp",
      creamBedroom:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/visualizer-room-cream-bedroom.webp",
    },
    phoneCameraWallPreview:
      "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/phone-camera-wall-preview.webp",
    processSteps: {
      step01ChooseMode:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/step-01-choose-mode.webp",
      step02MapYourWall:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/step-02-map-your-wall.webp",
      step03AdjustDesign:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/step-03-adjust-the-design.webp",
      step04CompareReview:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/step-04-compare-review.webp",
      step05SaveEnquire:
        "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/visualizer/step-05-save-enquire.webp",
    },
  },
} as const;
