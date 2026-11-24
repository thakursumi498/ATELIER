import { ATELIER_BRAND, ATELIER_CONTACTS } from "@/lib/brand";
import { EXPLORE_DESIGNS_HERO_CONTENT } from "@/lib/designs-catalogue";
import { PROJECTS_PAGE_CONTENT } from "@/lib/projects-catalogue";
import { ABOUT_PAGE_CONTENT, BLOGS_PAGE_CONTENT, PROCESS_PAGE_CONTENT } from "@/lib/blogs-catalogue";
import type { PageContentDocument, SiteSettingsDocument } from "@/types/models";

export function buildDefaultPageContents(): PageContentDocument[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: "page-home",
      pageKey: "home",
      hero: {
        eyebrow: "ATELIER — WALL STORY • MUMBAI",
        heading: ATELIER_BRAND.editorialHeadline,
        highlightedText: "Surface Art",
        subheading: ATELIER_BRAND.factualDescription,
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Explore Designs", href: "/explore-designs" },
        secondaryCta: { label: "Preview on Your Wall", href: "/visualizer" },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-explore-designs",
      pageKey: "explore-designs",
      hero: {
        eyebrow: EXPLORE_DESIGNS_HERO_CONTENT.eyebrow,
        heading: EXPLORE_DESIGNS_HERO_CONTENT.headline,
        highlightedText: "Every Space",
        subheading: EXPLORE_DESIGNS_HERO_CONTENT.supportingText,
        videoAsset: null,
        posterImage: null,
        primaryCta: {
          label: EXPLORE_DESIGNS_HERO_CONTENT.primaryCtaLabel,
          href: "#collection",
        },
        secondaryCta: {
          label: EXPLORE_DESIGNS_HERO_CONTENT.secondaryCtaLabel,
          href: "/visualizer",
        },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-projects",
      pageKey: "projects",
      hero: {
        eyebrow: PROJECTS_PAGE_CONTENT.hero.eyebrow,
        heading: `${PROJECTS_PAGE_CONTENT.hero.headlineLine1} ${PROJECTS_PAGE_CONTENT.hero.headlineLine2}`,
        highlightedText: PROJECTS_PAGE_CONTENT.hero.headlineLine2,
        subheading: PROJECTS_PAGE_CONTENT.hero.supportingText,
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Browse Portfolio", href: "#portfolio" },
        secondaryCta: { label: "Start an Enquiry", href: "/contact" },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-services",
      pageKey: "services",
      hero: {
        eyebrow: "MULTI-SURFACE 3D PRINTING",
        heading: "Direct-to-Surface Printing Across 6 Architectural Substrates",
        highlightedText: "6 Architectural Substrates",
        subheading:
          "Walls, tiles, plywood, office blinds, metals, and glass — executed with studio curation in Mumbai.",
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Enquire About Your Surface", href: "/contact" },
        secondaryCta: { label: "Explore Designs", href: "/explore-designs" },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-about",
      pageKey: "about",
      hero: {
        eyebrow: ABOUT_PAGE_CONTENT.hero.eyebrow,
        heading: `${ABOUT_PAGE_CONTENT.hero.headlineLine1} ${ABOUT_PAGE_CONTENT.hero.headlineLine2}`,
        highlightedText: ABOUT_PAGE_CONTENT.hero.headlineLine2,
        subheading: ABOUT_PAGE_CONTENT.hero.supportingText,
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Our Process", href: "/process" },
        secondaryCta: { label: "Visit / Enquire", href: "/contact" },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-process",
      pageKey: "process",
      hero: {
        eyebrow: PROCESS_PAGE_CONTENT.hero.eyebrow,
        heading: `${PROCESS_PAGE_CONTENT.hero.headlineLine1} ${PROCESS_PAGE_CONTENT.hero.headlineLine2}`,
        highlightedText: PROCESS_PAGE_CONTENT.hero.headlineLine2,
        subheading: PROCESS_PAGE_CONTENT.hero.supportingText,
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Explore the Process", href: "#stages" },
        secondaryCta: { label: "Start Your Project", href: "/contact" },
      },
      processStages: PROCESS_PAGE_CONTENT.stages.map((stage) => ({
        stepNumber: stage.stepNumber,
        code: stage.code,
        title: stage.title,
        description: stage.description,
        deliverables: [...stage.highlights],
      })),
      updatedAt: nowIso,
    },
    {
      id: "page-blogs",
      pageKey: "blogs",
      hero: {
        eyebrow: BLOGS_PAGE_CONTENT.hero.eyebrow,
        heading: `${BLOGS_PAGE_CONTENT.hero.headlineLine1} ${BLOGS_PAGE_CONTENT.hero.headlineLine2}`,
        highlightedText: BLOGS_PAGE_CONTENT.hero.headlineLine2,
        subheading: BLOGS_PAGE_CONTENT.hero.supportingText,
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Browse Journal", href: "#articles" },
        secondaryCta: { label: "Explore Designs", href: "/explore-designs" },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-contact",
      pageKey: "contact",
      hero: {
        eyebrow: "ATELIER — WALL STORY",
        heading: "Let's Create Something Remarkable.",
        highlightedText: "Remarkable.",
        subheading:
          "Tell us about your space, surface, your ideas, and the wall story you want to create. Our Mumbai studio will get in touch with you soon.",
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Start a Project Enquiry", href: "#enquiry-form" },
        secondaryCta: {
          label: "WhatsApp Our Studio",
          href: "https://wa.me/918017463132",
        },
      },
      updatedAt: nowIso,
    },
    {
      id: "page-visualizer",
      pageKey: "visualizer",
      hero: {
        eyebrow: "ATELIER — WALL STORY",
        heading: "Visualize the Design in Your Own Space.",
        highlightedText: "Own Space.",
        subheading:
          "See how our artwork transforms your wall in real time. Capture your space with your camera or upload a room photo, map the wall, and preview your selected design with accurate perspective.",
        videoAsset: null,
        posterImage: null,
        primaryCta: { label: "Start Live Preview", href: "#live-camera" },
        secondaryCta: { label: "Upload Room Photo", href: "#upload-photo" },
      },
      processStages: [
        {
          stepNumber: 1,
          code: "01",
          title: "Choose Mode",
          description:
            "Use Live Camera, upload a room photo, or select a sample room.",
          deliverables: [],
        },
        {
          stepNumber: 2,
          code: "02",
          title: "Map Your Wall",
          description:
            "Drag the four corner pins to match your wall's perspective.",
          deliverables: [],
        },
        {
          stepNumber: 3,
          code: "03",
          title: "Adjust the Design",
          description:
            "Refine scale, positioning, opacity, and orientation.",
          deliverables: [],
        },
        {
          stepNumber: 4,
          code: "04",
          title: "Compare & Review",
          description:
            "Toggle between your space and the mapped design to see the transformation.",
          deliverables: [],
        },
        {
          stepNumber: 5,
          code: "05",
          title: "Save or Enquire",
          description:
            "Download your preview or share it with our Mumbai studio.",
          deliverables: [],
        },
      ],
      updatedAt: nowIso,
    },
  ];
}


export function buildDefaultSiteSettings(): SiteSettingsDocument {
  return {
    id: "site-settings-global",
    singletonKey: "global",
    brandName: ATELIER_BRAND.name,
    tagline: ATELIER_BRAND.brandStory,
    logoLight: {
      publicId: "brand/atelier-logo-primary",
      secureUrl: "/brand/atelier-logo-primary.png",
      resourceType: "image",
      altText: `${ATELIER_BRAND.name} Logo`,
    },
    logoDark: {
      publicId: "brand/atelier-logo-white",
      secureUrl: "/brand/atelier-logo-white.png",
      resourceType: "image",
      altText: `${ATELIER_BRAND.name} White Logo`,
    },
    contact: {
      primaryPhone: ATELIER_CONTACTS[0]?.phones[0]?.display || "+91 85919 71675",
      whatsappNumber:
        ATELIER_CONTACTS[0]?.phones[1]?.display || "+91 80174 63132",
      email: ATELIER_BRAND.email.proposedAddress,
      studioAddress: ATELIER_BRAND.address.full,
      workingHours: "Mon – Sat • 10:30 AM – 7:30 PM IST (By Appointment)",
    },
    socialLinks: {
      instagram: "",
      facebook: "",
      linkedin: "",
      youtube: "",
      pinterest: "",
    },
    visualizer: {
      externalVisualizerUrl: "/visualizer",
      enableEmbeddedPreview: true,
    },
    defaultSeo: {
      metaTitle: `${ATELIER_BRAND.name} | 3D Wall Printing & Surface Art Mumbai`,
      metaDescription: ATELIER_BRAND.factualDescription,
      ogImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-botanical-canopy.webp",
    },
    updatedAt: new Date().toISOString(),
  };
}
