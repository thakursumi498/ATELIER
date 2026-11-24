/**
 * Canonical Navigation & Route Registry for Priyanka Wall Website.
 * Enforces the 8 primary public pages and the protected /admin modules.
 */

export interface NavItem {
  label: string;
  href: string;
  code: string;
  description: string;
  badge?: string;
}

export const PUBLIC_NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    code: "01",
    label: "Home",
    href: "/",
    description: "Promotional video hero, studio overview, featured collections, and wall visualizer entry.",
  },
  {
    code: "02",
    label: "Explore Designs",
    href: "/explore-designs",
    description: "Unified catalog for all 12 design categories with search and Wall Preview.",
    badge: "12 Categories",
  },
  {
    code: "03",
    label: "Our Projects",
    href: "/projects",
    description: "Completed residential, hospitality, and commercial wall installations with photography and video.",
  },
  {
    code: "04",
    label: "Services",
    href: "/services",
    description: "Bespoke wall murals, surface treatments, architectural finishes, and end-to-end execution.",
  },
  {
    code: "05",
    label: "About Us",
    href: "/about",
    description: "Studio story, artistic philosophy, mission, vision, and craftsmanship standards.",
  },
  {
    code: "06",
    label: "Our Process",
    href: "/process",
    description: "Step-by-step workflow from consultation and customization to wall visualization and installation.",
  },
  {
    code: "07",
    label: "Blogs",
    href: "/blogs",
    description: "Editorial insights, material guides, and studio updates from the ATELIER team.",
  },
  {
    code: "08",
    label: "Contact Us",
    href: "/contact",
    description: "Direct project consultation and design enquiry form with database persistence.",
  },
];

export interface AdminNavModule {
  id: string;
  label: string;
  href: string;
  collectionName: string;
  summary: string;
}

export const ADMIN_NAV_MODULES: ReadonlyArray<AdminNavModule> = [
  {
    id: "overview",
    label: "Dashboard",
    href: "/admin",
    collectionName: "enquiries",
    summary: "A compact overview of recent customer enquiries and managed website images.",
  },
  {
    id: "images",
    label: "Manage Images",
    href: "/admin/images",
    collectionName: "cloudinary",
    summary: "Manage website images by page, category, and subcategory.",
  },
  {
    id: "enquiries",
    label: "Enquiries",
    href: "/admin/enquiries",
    collectionName: "enquiries",
    summary: "Review customer enquiries, update their status, and send owner-only notification retries.",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    collectionName: "configuration",
    summary: "Check the status of website image, enquiry, and email services.",
  },
];

