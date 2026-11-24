import type { Metadata } from "next";
import { buildDefaultPageContents, buildDefaultSiteSettings } from "@/lib/public-content";
import type { PageContentDocument } from "@/types/models";
export function siteOrigin() { return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""); }
export function pageMetadata(key: PageContentDocument["pageKey"], title: string, description: string): Metadata {
  const path = key === "home" ? "/" : `/${key}`;
  const page = buildDefaultPageContents().find(item => item.pageKey === key);
  const resolvedTitle = page?.seo?.metaTitle || page?.hero.heading || title;
  const resolvedDescription = page?.seo?.metaDescription || page?.hero.subheading || description;
  return { title: resolvedTitle, description: resolvedDescription, alternates: { canonical: page?.seo?.canonicalUrl || path }, openGraph: { title: resolvedTitle, description: resolvedDescription, url: path, type: "website", ...(page?.seo?.ogImageUrl ? { images: [page.seo.ogImageUrl] } : {}) }, robots: page?.seo?.noIndex ? { index: false, follow: false } : { index: true, follow: true } };
}
export function siteMetadata(): Metadata {
  const settings = buildDefaultSiteSettings();
  return { metadataBase: new URL(siteOrigin()), title: { default: settings.defaultSeo.metaTitle || settings.brandName, template: `%s | ${settings.brandName}` }, description: settings.defaultSeo.metaDescription, ...(settings.favicon?.secureUrl ? { icons: { icon: settings.favicon.secureUrl, shortcut: settings.favicon.secureUrl } } : {}), openGraph: { siteName: settings.brandName, ...(settings.defaultSeo.ogImageUrl ? { images: [settings.defaultSeo.ogImageUrl] } : {}) } };
}
