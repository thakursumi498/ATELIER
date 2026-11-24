import type { MetadataRoute } from "next";
import { DEVELOPMENT_PROJECT_FIXTURES } from "@/lib/projects-catalogue";
import { DEVELOPMENT_BLOG_FIXTURES } from "@/lib/blogs-catalogue";
import { siteOrigin } from "@/lib/public-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const paths = ["", "explore-designs", "projects", "services", "about", "process", "blogs", "visualizer", "contact"];
  return [
    ...paths.map((path) => ({ url: `${origin}${path ? `/${path}` : "/"}`, changeFrequency: "weekly" as const })),
    ...DEVELOPMENT_PROJECT_FIXTURES.filter((project) => project.published).map((project) => ({ url: `${origin}/projects/${encodeURIComponent(project.slug)}`, lastModified: project.updatedAt })),
    ...DEVELOPMENT_BLOG_FIXTURES.filter((article) => article.published).map((article) => ({ url: `${origin}/blogs/${encodeURIComponent(article.slug)}`, ...(article.publishedIso ? { lastModified: article.publishedIso } : {}) })),
  ];
}
