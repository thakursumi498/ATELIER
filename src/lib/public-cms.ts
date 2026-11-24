import { cache } from "react";
import {
  assignArtworkReferenceCodes,
  DEVELOPMENT_FIXTURE_DESIGNS,
  DESIGN_CATEGORY_RECORDS,
} from "@/lib/designs-catalogue";
import { DEVELOPMENT_BLOG_FIXTURES } from "@/lib/blogs-catalogue";
import { DEVELOPMENT_PROJECT_FIXTURES } from "@/lib/projects-catalogue";
import { DEFAULT_HOMEPAGE_CONTENT, type HomepageContentConfig } from "@/lib/homepage-content";
import { buildDefaultPageContents, buildDefaultSiteSettings } from "@/lib/public-content";

/** Public text and catalogue records are source-controlled static content. */
export const isPrivatePreview = cache(async () => false);
export const getPublicCategories = cache(async () => [...DESIGN_CATEGORY_RECORDS]);
export const getPublicDesigns = cache(async () => assignArtworkReferenceCodes([...DEVELOPMENT_FIXTURE_DESIGNS]));
export const getPublicProjects = cache(async () => [...DEVELOPMENT_PROJECT_FIXTURES]);
export const getPublicBlogs = cache(async () => [...DEVELOPMENT_BLOG_FIXTURES]);
export const getPublicPages = cache(async () => buildDefaultPageContents());
export const getPublicSiteSettings = cache(async () => buildDefaultSiteSettings());
export const getPublicHomeContent = cache(async (): Promise<HomepageContentConfig> => structuredClone(DEFAULT_HOMEPAGE_CONTENT));
