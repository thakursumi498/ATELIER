"use client";
import { createContext, useContext, type ReactNode } from "react";
import { buildDefaultPageContents, buildDefaultSiteSettings } from "@/lib/public-content";
import type { PageContentDocument, SiteSettingsDocument } from "@/types/models";
type PublicSettings = Pick<SiteSettingsDocument, "brandName" | "tagline" | "logoLight" | "logoDark" | "contact" | "socialLinks" | "visualizer" | "defaultSeo" | "favicon" | "footerText" | "copyrightText" | "analyticsId">;
interface ContentState { pages: PageContentDocument[]; settings: PublicSettings | null; preview: boolean }
const staticContent: ContentState = { pages: buildDefaultPageContents(), settings: buildDefaultSiteSettings(), preview: false };
const PublicContent = createContext<ContentState>(staticContent);
export function useSiteSettings() { return useContext(PublicContent).settings; }
export function usePageContent(key: PageContentDocument["pageKey"]) { return useContext(PublicContent).pages.find(page => page.pageKey === key); }
export function PublicContentProvider({ children }: { children: ReactNode }) {
  return <PublicContent.Provider value={staticContent}>{children}</PublicContent.Provider>;
}
