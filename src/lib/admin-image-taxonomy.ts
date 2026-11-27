import { DRIVE_CATEGORY_ASSETS } from "@/lib/drive-category-assets";
import { DESIGN_CATEGORY_RECORDS } from "@/lib/designs-catalogue";
import { DEVELOPMENT_PROJECT_FIXTURES } from "@/lib/projects-catalogue";

export interface AdminImageSection {
  slug: string;
  name: string;
}

export interface AdminImageSubcategory {
  slug: string;
  name: string;
  imageCount: number;
}

export interface AdminImageCategory {
  slug: string;
  name: string;
  slotCode?: string;
  slotNumber?: number;
  retired: boolean;
  isPublic: boolean;
  imageCount: number;
  subcategories: AdminImageSubcategory[];
}

export interface AdminImageTaxonomy {
  sections: Array<AdminImageSection & { imageCount: number }>;
  categories: AdminImageCategory[];
  projectGalleries: Array<{ slug: string; name: string; imageCount: number }>;
  publicCounts: { designCategories: number; subcategories: number };
}

export interface AdminTaxonomyAsset {
  categorySlug?: string;
  subcategorySlug?: string;
  projectSlug?: string;
  placement?: string;
  sectionSlugs?: string[];
  references?: ReadonlyArray<{ sourcePath?: string }>;
  context?: Record<string, string>;
}

export const WEBSITE_IMAGE_SECTIONS: ReadonlyArray<AdminImageSection> = [
  { slug: "home", name: "Homepage" },
  { slug: "explore-designs", name: "Explore Designs" },
  { slug: "projects", name: "Our Projects" },
  { slug: "services", name: "Services" },
  { slug: "about", name: "About Us" },
  { slug: "process", name: "Our Process" },
  { slug: "blogs", name: "Journal" },
  { slug: "contact", name: "Contact Us" },
  { slug: "visualizer", name: "Wall Preview" },
  { slug: "other", name: "Other Website Images" },
  { slug: "library", name: "Unassigned Uploads" },
];

const WEBSITE_PAGE_SECTIONS = new Set(
  WEBSITE_IMAGE_SECTIONS.map((section) => section.slug).filter(
    (slug) => slug !== "other" && slug !== "library",
  ),
);

/** Keep assigned or referenced website images in Manage Images, including inactive designs. */
export function isWebsiteImageInUse(asset: AdminTaxonomyAsset): boolean {
  if (asset.placement === "library" || asset.placement === "replacement-staging") return false;
  if (asset.context?.upload_request_id && asset.context.upload_request_status !== "complete") return false;
  if (asset.references?.length) return true;
  if (asset.placement && WEBSITE_PAGE_SECTIONS.has(asset.placement)) return true;
  if (asset.sectionSlugs?.some((section) => WEBSITE_PAGE_SECTIONS.has(section))) return true;
  return asset.placement === "project-gallery" && Boolean(asset.projectSlug);
}

export function normalizeImageSectionSlug(value: string | undefined | null): string | null {
  const slug = value?.trim().toLowerCase();
  if (!slug) return null;
  if (slug === "miscellaneous" || slug === "other") return "other";
  if (slug === "admin-library" || slug === "library" || slug === "uploads") return "library";
  return WEBSITE_IMAGE_SECTIONS.some((section) => section.slug === slug) ? slug : "other";
}

function pageSlugFromSourceFile(sourceFile: string): string | null {
  const component = sourceFile.match(/^src\/components\/(home|explore-designs|projects|services|about|process|blogs|contact|visualizer)\//u)?.[1];
  if (component) return normalizeImageSectionSlug(component);
  const appPage = sourceFile.match(/^src\/app\/(home|explore-designs|projects|services|about|process|blogs|contact|visualizer)\//u)?.[1];
  if (appPage) return normalizeImageSectionSlug(appPage);
  const libraryPage = sourceFile.match(/^src\/lib\/(homepage-content|projects-catalogue|services-scroll-data|blogs-catalogue|designs-catalogue)\.ts$/u)?.[1];
  if (libraryPage === "homepage-content") return "home";
  if (libraryPage === "projects-catalogue") return "projects";
  if (libraryPage === "services-scroll-data") return "services";
  if (libraryPage === "blogs-catalogue") return "blogs";
  if (libraryPage === "designs-catalogue") return "explore-designs";
  return null;
}

export function getAssetSectionSlugs(input: {
  categorySlug?: string;
  placement?: string;
  context?: Record<string, string>;
  references?: ReadonlyArray<{ page?: string; sourceFiles?: ReadonlyArray<string> }>;
}): string[] {
  const pages = new Set<string>();
  if (input.categorySlug) pages.add("explore-designs");
  for (const reference of input.references || []) {
    const slug = normalizeImageSectionSlug(reference.page);
    if (slug) pages.add(slug);
    for (const sourceFile of reference.sourceFiles || []) {
      const sourcePage = pageSlugFromSourceFile(sourceFile);
      if (sourcePage) pages.add(sourcePage);
    }
  }
  const contextPage = normalizeImageSectionSlug(input.context?.page);
  if (contextPage) pages.add(contextPage);
  if (input.placement === "library" || input.context?.section === "uploads") pages.add("library");

  return pages.size ? [...pages] : ["other"];
}

export function getDesignSubcategory(
  categorySlug: string,
  artworkCode: string,
  context: Record<string, string> = {},
): { name: string; slug: string } | null {
  const category = DRIVE_CATEGORY_ASSETS.find((item) => item.slug === categorySlug);
  if (!category) return null;

  const storedSlug = context.subcategory_slug?.trim().toLowerCase();
  const storedName = context.subcategory_name?.trim();
  const configured = category.images.map((image) => image.subCategory).filter(Boolean);
  const stored = configured.find((name) =>
    (storedName && name === storedName) || (storedSlug && slugifyImageTaxonomyLabel(name) === storedSlug),
  );
  const image = category.images.find((item) => item.code.toUpperCase() === artworkCode.toUpperCase());
  const name = stored || image?.subCategory;
  return name ? { name, slug: slugifyImageTaxonomyLabel(name) } : null;
}

export function slugifyImageTaxonomyLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildAdminImageTaxonomy(assets: ReadonlyArray<AdminTaxonomyAsset>): AdminImageTaxonomy {
  const publicCategorySlugs = new Set(DESIGN_CATEGORY_RECORDS.map((category) => category.slug));
  const sections = WEBSITE_IMAGE_SECTIONS.map((section) => ({
    ...section,
    imageCount: assets.filter((asset) => asset.sectionSlugs?.includes(section.slug)).length,
  }));

  const categories = DRIVE_CATEGORY_ASSETS.map((category) => {
    const categoryAssets = assets.filter((asset) => asset.categorySlug === category.slug);
    const subcategories = [...new Set(category.images.map((image) => image.subCategory).filter(Boolean))]
      .map((name) => {
        const slug = slugifyImageTaxonomyLabel(name);
        return {
          name,
          slug,
          imageCount: categoryAssets.filter((asset) => asset.subcategorySlug === slug).length,
        };
      });
    return {
      slug: category.slug,
      name: category.name,
      slotCode: category.slotCode,
      slotNumber: category.slotNumber,
      retired: !publicCategorySlugs.has(category.slug),
      isPublic: publicCategorySlugs.has(category.slug),
      imageCount: categoryAssets.length,
      subcategories,
    };
  });

  const projectGalleries = DEVELOPMENT_PROJECT_FIXTURES.filter((project) => project.published).map((project) => ({
    slug: project.slug,
    name: project.shortTitle || project.title,
    imageCount: project.galleryMedia.length + assets.filter((asset) => asset.placement === "project-gallery" && asset.projectSlug === project.slug).length,
  }));

  return {
    sections,
    categories,
    projectGalleries,
    publicCounts: {
      designCategories: categories.filter((category) => category.isPublic).length,
      subcategories: categories
        .filter((category) => category.isPublic)
        .reduce((count, category) => count + category.subcategories.length, 0),
    },
  };
}
