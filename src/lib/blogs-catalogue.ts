/**
 * Canonical Content & Data Architecture for:
 *  - Page 05: About Us (`/about` & `/about-us`)
 *  - Page 06: Our Process (`/process` & `/our-process`)
 *  - Page 07: Blogs (`/blogs` & `/blogs/[slug]`)
 *
 * Strictly enforces ATELIER — WALL STORY brand governance:
 *  - Professionally edits the client's supplied description without publishing
 *    "first 3D wall printing company in Mumbai" as an independently verified fact.
 *  - Never invents company history, founding years, team biographies, or human blog authors.
 */

import { MediaAssetRef } from "@/types/models";
import { ATELIER_BRAND } from "@/lib/brand";

/* ============================================================================
   PART 03 — ABOUT US CONTENT STRUCTURE
============================================================================ */

export const ABOUT_PAGE_CONTENT = {
  hero: {
    eyebrow: "ABOUT ATELIER",
    headlineLine1: "Every Wall",
    headlineLine2: "Has a Story.",
    supportingText:
      "A Mumbai-based creative wall-art studio bringing expressive murals, thoughtful design, and multi-surface printing into contemporary spaces.",
    heroImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-hero-crane-dining.webp",
    isProvisionalCopy: false,
  },
  studioStory: {
    eyebrow: "THE STUDIO STORY",
    headlineLine1: "Design. Print.",
    headlineLine2: "Transform Spaces.",
    paragraph1:
      "ATELIER — WALL STORY creates expressive wall-art experiences that bring visual identity, texture, and artistic character into architectural spaces.",
    paragraph2:
      "Based in Oshiwara, Andheri West, Mumbai, the studio explores how design and direct-to-surface printing can transform ordinary walls—as well as tiles, plywood, office blinds, metals, and glass—into meaningful visual environments.",
    archVisualUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-story-sculptural-arch.webp",
    sketchbookVisualUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-story-sketchbook.webp",
    ctaLabel: "Explore Our Services",
    ctaHref: "/services",
  },
  introduction: {
    eyebrow: "Brand Introduction",
    heading:
      "Expressive 3D Wall Printing, Artistic Murals & Multi-Surface Art in Mumbai",
    editedClientStatement:
      "ATELIER — Wall Story designs and creates expressive wall solutions that bring spaces to life through art, texture, and detail. Based in Oshiwara, Andheri West, Mumbai, we specialize in murals and conceptual wall art printed directly onto your walls—as well as tiles, plywood, office blinds, metals, and glass.",
    supportingParagraph:
      "By applying artwork directly onto vertical architectural surfaces, we help residences, offices, and commercial environments move beyond conventional framed prints and seamed wall coverings into cohesive surface storytelling.",
    governanceNote:
      "Crafted at our studio in Oshiwara, Andheri West, Mumbai—bringing bespoke murals and surface printing to residential, commercial, and hospitality interiors.",
    visualUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-terracotta-wave.webp",
  },
  philosophy: {
    eyebrow: "OUR PHILOSOPHY",
    heading: "The Principles That Guide Us.",
    supportingText:
      "A considered approach to surface design — where creativity, material understanding, and spatial balance come together.",
    ctaLabel: "View Our Approach",
    ctaHref: "/process",
    archVisualUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-philosophy-arch-alcove.webp",
    themes: [
      {
        code: "01",
        icon: "petal" as const,
        title: "Design-Led Thinking",
        description:
          "Every surface begins with a considered creative direction.",
      },
      {
        code: "02",
        icon: "layers" as const,
        title: "Material Awareness",
        description:
          "Artwork should respond to the characteristics of the surface.",
      },
      {
        code: "03",
        icon: "cube" as const,
        title: "Spatial Harmony",
        description:
          "Art, scale, color, and placement should work with the architecture.",
      },
      {
        code: "04",
        icon: "infinity" as const,
        title: "Lasting Impressions",
        description:
          "Thoughtful visual expression can give ordinary spaces a distinctive identity.",
      },
    ],
  },
  peopleBehindStudio: {
    eyebrow: "THE PEOPLE BEHIND THE STUDIO",
    supportingText:
      "A Mumbai studio crafting bespoke murals and direct-to-surface prints with care.",
    representativeWorkspaces: [
      {
        imageUrl: "/images/atelier/about/about-person-saikat-ray-portrait.webp",
        shortRole: "Managing Director",
        alt: "Saikat Ray, Managing Director at ATELIER — WALL STORY, in a navy polo against a warm studio backdrop",
      },
      {
        imageUrl: "/images/atelier/about/about-person-triparna-bardhan-portrait.webp",
        shortRole: "Managing Director",
        alt: "Triparna Bardhan, Managing Director at ATELIER — WALL STORY, in a mustard-yellow blouse and colourful navy sari, facing the camera in a warm studio",
      },
    ],
    mumbaiStudio: {
      eyebrow: "OUR MUMBAI STUDIO",
      conceptImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-mumbai-studio-concept.webp",
      conceptAlt:
        "Conceptual luxury Mumbai wall-art studio interior featuring a warm plaster archway, olive tree, curved bouclé seating, and direct-printed terracotta and sage botanical mural",
    },
  },
  advantageRibbon: {
    eyebrow: "THE ATELIER ADVANTAGE",
    items: [
      {
        id: "mumbai-studio",
        title: "Mumbai Studio",
        subtitle: "Oshiwara, Andheri West",
      },
      {
        id: "six-surfaces",
        title: "6 Surface Types",
        subtitle: "Walls, Tiles, Plywood, Blinds, Metals & Glass",
      },
      {
        id: "design-categories",
        title: "12 Design Categories",
        subtitle: "Curated mural & conceptual collections",
      },
      {
        id: "studio-execution",
        title: "Studio-Led Execution",
        subtitle: "From concept to on-site printing",
      },
    ],
  },
  creativeEvolution: {
    eyebrow: "OUR CREATIVE EVOLUTION",
    heading: "A Growing Wall Story.",
    supportingText:
      "A continuous journey of design, technology, and material exploration — expanding what walls can express.",
    alcoveImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/about/about-evolution-plaster-alcove.webp",
    pillars: [
      {
        code: "01",
        label: "Architectural Vision",
        summary: "Studio founded in Mumbai around expressive wall art.",
      },
      {
        code: "02",
        label: "6 Printable Surfaces",
        summary: "Expanded to walls, tiles, plywood, blinds, metals & glass.",
      },
      {
        code: "03",
        label: "12 Design Categories",
        summary: "Curated botanical, textured, architectural & mineral collections.",
      },
      {
        code: "04",
        label: "Wall Visualizer",
        summary: "Interactive room preview for confident scale & placement.",
      },
      {
        code: "05",
        label: "Bespoke Spaces",
        summary: "Continuing to craft expressive residential & commercial walls.",
      },
    ],
  },
  missionAndVision: {
    eyebrow: "Studio Mission & Vision",
    governanceNotice:
      "Guided by architectural restraint, tactile materiality, and bespoke visual storytelling across six distinct interior substrates.",
    mission: {
      label: "OUR MISSION",
      title: "Bringing Expressive Art Directly to Architectural Surfaces",
      body: "Transforming residential and commercial spaces through curated design and multi-surface craftsmanship.",
    },
    vision: {
      label: "Our Vision",
      title: "Redefining How Interior Elevations Are Experienced",
      body: "To cultivate an architectural design studio where every vertical surface—from living room walls to glazed office partitions—can tell a considered, lasting visual story.",
    },
  },
  finalCta: {
    eyebrow: "LET'S CREATE TOGETHER",
    headline: "Let's Create a Wall Story Together.",
    supportingText:
      "Bring your space, surface, and design vision. Connect with our Mumbai studio to explore a tailored wall-art solution.",
    primaryCtaLabel: "Start a Project Enquiry",
    primaryCtaHref: "/contact?intent=about",
    secondaryCtaLabel: "WhatsApp Our Studio",
    secondaryCtaHref: "/contact",
  },
};

/* ============================================================================
   PART 04 — OUR PROCESS CONTENT STRUCTURE
============================================================================ */

export interface InteractiveProcessStage {
  stepNumber: number;
  code: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  shortSummary: string;
  description: string;
  highlights: ReadonlyArray<string>;
  miniatureObjects: ReadonlyArray<string>;
  imageUrl: string;
  imageCaption: string;
  ctaLabel?: string;
  ctaHref?: string;
  isProvisional: true;
}

export const PROCESS_PAGE_CONTENT = {
  hero: {
    eyebrow: "OUR PROCESS",
    headlineLine1: "From an Idea to an",
    headlineLine2: "Extraordinary Wall.",
    supportingText:
      "A considered, collaborative process that turns ideas, artwork, and spaces into beautifully printed architectural surfaces.",
    heroImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-hero-sculptural-arch.webp",
    isProvisionalCopy: false,
  },
  provisionalNotice:
    "Our five-stage studio workflow ensures every mural and multi-surface print is thoughtfully proportioned, visualized on your wall, and executed with care.",
  stages: [
    {
      stepNumber: 1,
      code: "01",
      eyebrow: "STAGE 01 OF 05",
      title: "Consultation",
      subtitle: "UNDERSTANDING YOUR SPACE, SURFACE & VISION",
      shortSummary: "Share your surface, dimensions, and creative direction.",
      description:
        "Begin by sharing your target surface, approximate dimensions, interior style, and creative direction with our Mumbai studio.",
      highlights: [
        "Discuss the target printing surface (Walls, Tiles, Plywood, Office Blinds, Metals, or Glass).",
        "Understand approximate dimensions, sightlines, and architectural conditions.",
        "Explore visual direction, requirements, and tonal preferences.",
      ],
      miniatureObjects: [
        "Design Notebook & Sketches",
        "6 Surface Material Samples",
        "Architectural Scale Brief",
      ],
      imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-01-consultation.webp",
      imageCaption:
        "Stage 01 • Architectural Consultation Desk with Surface Swatches & Sketches",
      ctaLabel: "Start a Consultation",
      ctaHref: "/contact?intent=consultation",
      isProvisional: true,
    },
    {
      stepNumber: 2,
      code: "02",
      eyebrow: "STAGE 02 OF 05",
      title: "Design Exploration",
      subtitle: "CURATING ARTWORK FOR YOUR SPACE",
      shortSummary: "Explore 12 design categories or commission bespoke art.",
      description:
        "Explore our curated design catalogue or collaborate with the studio on a bespoke mural or conceptual wall-art direction.",
      highlights: [
        "Discover available design categories across 12 unified collections.",
        "Explore mural styles, textures, and architectural compositions.",
        "Shortlist artwork suited to your space and natural lighting.",
      ],
      miniatureObjects: [
        "Botanical & Arch Preview Screen",
        "Curated Artwork Sheets",
        "Tactile Substrate Swatches",
      ],
      imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/artwork-lotus-atelier.webp",
      imageCaption: "Stage 02 • Curated Mural & Surface Artwork Exploration",
      ctaLabel: "Explore Designs",
      ctaHref: "/explore-designs",
      isProvisional: true,
    },
    {
      stepNumber: 3,
      code: "03",
      eyebrow: "STAGE 03 OF 05",
      title: "Customization",
      subtitle: "PROPORTION, PLACEMENT & VISUAL PREVIEW",
      shortSummary: "Preview on your wall and refine scale, crop & placement.",
      description:
        "Review the shortlisted artwork in the context of your own wall and refine the composition, proportions, and placement.",
      highlights: [
        "Preview selected artwork directly on a photograph of your wall.",
        "Adjust supported positioning, perspective, and scaling controls.",
        "Review how the design fits the surrounding architecture and furnishings.",
      ],
      miniatureObjects: [
        "Room Elevation Composition",
        "Warm Tonal Palette Swatches",
        "Scale & Crop Calibration",
      ],
      imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/miscellaneous/wall-preview-after.webp",
      imageCaption:
        "Stage 03 • Proportion, Placement & Interactive Wall Visualization",
      ctaLabel: "Launch Wall Visualizer",
      ctaHref: "/visualizer",
      isProvisional: true,
    },
    {
      stepNumber: 4,
      code: "04",
      eyebrow: "STAGE 04 OF 05",
      title: "Design Approval",
      subtitle: "FINAL ARTWORK REVIEW & SURFACE READINESS",
      shortSummary: "Confirm the final artwork proof and surface readiness.",
      description:
        "Review the proposed composition and confirm the final design and surface preparation requirements before execution is scheduled.",
      highlights: [
        "Review the final proportioned design proof and layout sheet.",
        "Confirm exact artwork placement and architectural clearances.",
        "Discuss surface preparation and on-site execution readiness.",
      ],
      miniatureObjects: [
        "Approved Design Proof Sheet",
        "Final Elevation Layout",
        "Surface Readiness Sign-Off",
      ],
      imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-04-approval.webp",
      imageCaption:
        "Stage 04 • Final Artwork Proof, Colour Swatches & Architectural Plans",
      ctaLabel: "Inspect Printable Surfaces",
      ctaHref: "/services#service-spectrum",
      isProvisional: true,
    },
    {
      stepNumber: 5,
      code: "05",
      eyebrow: "STAGE 05 OF 05",
      title: "Printing & Installation",
      subtitle: "BRINGING YOUR WALL STORY TO LIFE",
      shortSummary: "Precision direct-to-surface printing on your prepared wall.",
      description:
        "Your selected artwork is printed directly onto the prepared architectural surface using the agreed production process.",
      highlights: [
        "Prepare the selected printing surface for clean registration.",
        "Execute the approved artwork directly onto the architectural substrate.",
        "Review the finished application with our Mumbai studio team.",
      ],
      miniatureObjects: [
        "Direct-to-Surface Print Pass",
        "Seamless Architectural Finish",
        "Completed Wall Installation",
      ],
      imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/process/process-stage-05-execution.webp",
      imageCaption:
        "Stage 05 • Completed Seamless Direct-to-Surface Architectural Mural",
      ctaLabel: "Start Your Project",
      ctaHref: "/contact?intent=process",
      isProvisional: true,
    },
  ] satisfies ReadonlyArray<InteractiveProcessStage>,
  visualizerJourney: {
    eyebrow: "Design to Wall Preview Journey",
    heading: "Bridge Seamlessly from Catalogue Discovery to Spatial Preview",
    supportingText:
      "Our process integrates directly with our interactive Wall Visualizer so you can evaluate designs on your own wall before submitting an enquiry.",
    steps: [
      {
        step: "01",
        title: "Explore Designs",
        detail: "Browse all 12 categories on /explore-designs.",
        href: "/explore-designs",
      },
      {
        step: "02",
        title: "Select Artwork",
        detail: "Open any design plate to inspect multi-angle views.",
        href: "/explore-designs?category=cat-01",
      },
      {
        step: "03",
        title: "Preview on My Wall",
        detail: "Stage the design into /visualizer for live wall preview.",
        href: "/visualizer",
      },
      {
        step: "04",
        title: "Contact Atelier",
        detail: "Send your enquiry with the selected design prefilled.",
        href: "/contact",
      },
    ],
  },
  finalCta: {
    eyebrow: "Start the Journey",
    headlineLine1: "READY TO BEGIN",
    headlineLine2: "YOUR WALL STORY?",
    supportingText:
      "Explore our design collection or get in touch with our Oshiwara, Mumbai team to discuss your wall or surface project.",
    primaryCtaLabel: "Explore Designs",
    primaryCtaHref: "/explore-designs",
    secondaryCtaLabel: "Get in Touch",
    secondaryCtaHref: "/contact",
  },
};

/* ============================================================================
   PART 05 — BLOGS & EDITORIAL JOURNAL ARCHITECTURE
============================================================================ */

export interface BlogCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  isDraftTaxonomy: true;
}

export const BLOG_DRAFT_CATEGORIES: ReadonlyArray<BlogCategoryRecord> = [
  {
    id: "blog-cat-wall-art",
    name: "Wall Art",
    slug: "wall-art",
    description:
      "Perspectives on direct-to-wall murals, conceptual compositions, and architectural scale.",
    isDraftTaxonomy: true,
  },
  {
    id: "blog-cat-design-inspiration",
    name: "Design Inspiration",
    slug: "design-inspiration",
    description:
      "Curated ideas for integrating tonal balance, geometry, and texture into interior elevations.",
    isDraftTaxonomy: true,
  },
  {
    id: "blog-cat-materials",
    name: "Materials",
    slug: "materials",
    description:
      "Exploring direct 3D printing across walls, tiles, plywood, office blinds, metals, and glass.",
    isDraftTaxonomy: true,
  },
  {
    id: "blog-cat-creative-spaces",
    name: "Creative Spaces",
    slug: "creative-spaces",
    description:
      "How residential living rooms, studios, and commercial workspaces use wall art to shape atmosphere.",
    isDraftTaxonomy: true,
  },
  {
    id: "blog-cat-company-updates",
    name: "Company Updates",
    slug: "company-updates",
    description:
      "Studio notes and catalogue announcements from ATELIER — WALL STORY in Mumbai.",
    isDraftTaxonomy: true,
  },
];

export interface BlogArticleSection {
  heading: string;
  paragraphs: ReadonlyArray<string>;
  bullets?: ReadonlyArray<string>;
  blockquote?: {
    text: string;
    attribution?: string;
  };
  figure?: {
    imageUrl: string;
    altText: string;
    caption: string;
  };
}

export interface BlogArticleRecord {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  excerpt: string;
  coverImage: MediaAssetRef;
  sections: ReadonlyArray<BlogArticleSection>;
  tags: ReadonlyArray<string>;
  /** Optional author; never fabricates personal names */
  authorLabel?: string | null;
  /** Optional publication date; null for unscheduled draft fixtures */
  publishedAtLabel: string;
  publishedIso?: string | null;
  readingTimeMinutes: number;
  featured: boolean;
  published: boolean;
  isEditorialFixture: boolean;
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
  };
}

export function computeReadingTimeMinutes(
  sections: ReadonlyArray<BlogArticleSection>,
  excerpt: string = ""
): number {
  const text = [
    excerpt,
    ...sections.flatMap((s) => [s.heading, ...s.paragraphs]),
  ].join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 180));
}

export const BLOGS_PAGE_CONTENT = {
  hero: {
    eyebrow: `${ATELIER_BRAND.name} • Editorial Journal`,
    headlineLine1: "IDEAS, ART",
    headlineLine2: "& INSPIRATION.",
    supportingText:
      "Discover perspectives on wall art, creative spaces, materials and design.",
    isProvisionalCopy: false,
  },
};

const RAW_EDITORIAL_FIXTURES: ReadonlyArray<
  Omit<BlogArticleRecord, "readingTimeMinutes">
> = [
  {
    id: "blog-fixture-01",
    title:
      "Direct-to-Surface 3D Wall Printing: Composing Art Around Interior Architecture",
    slug: "direct-to-surface-3d-wall-printing-interior-architecture",
    categorySlug: "wall-art",
    categoryName: "Wall Art",
    excerpt:
      "How direct vertical printing transforms prepared walls into seamless murals and conceptual art without pasted wallpaper joints or framing.",
    coverImage: {
      publicId: "blogs/fixture-01-cover",
      secureUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-direct-to-surface-printing-cover.webp",
      resourceType: "image",
      width: 1600,
      height: 1000,
      format: "jpg",
      altText: "Vertical wall-printing rig three-quarters through a sepia and sage landscape mural in a residential living room",
    },
    sections: [
      {
        heading: "Moving Beyond Seamed Wall Coverings",
        paragraphs: [
          "Traditional interior wall treatments often require compromise: framed canvases cover only a fraction of a large elevation, while pasted wallpaper rolls introduce repeating seams and adhesive edges that can lift in humid coastal climates.",
          "Direct-to-surface 3D wall printing approaches the vertical plane differently. By printing directly onto the prepared wall surface itself, the artwork becomes part of the room's architecture—respecting ceiling heights, reveals, and ambient light.",
        ],
        figure: {
          imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-seamless-wall-detail.webp",
          altText: "One continuous ochre and charcoal artwork wrapping seamlessly around a window reveal and outside corner",
          caption:
            "Architectural Elevation Study — Balancing Warm Limestone Tones with Sculpted Depth.",
        },
      },
      {
        heading: "Proportioning Murals for Real Sightlines",
        paragraphs: [
          "Every room is experienced in motion—from the doorway, across a dining table, or along a corridor. Before printing begins, ATELIER — WALL STORY allows visitors to explore compositions across 12 unified design categories and preview selected artwork on their own wall photo via our Wall Visualizer.",
          "Whether the goal is a calm minimal horizon or an expressive conceptual statement, proportioning the artwork around existing furniture and architectural trim ensures visual harmony.",
        ],
        bullets: [
          "Seamless direct-to-surface application without repeating wallpaper roll joints",
          "Custom cropping and scaling tailored to room height, doorways, and sightlines",
          "Interactive pre-commission wall preview across mural and pattern modes",
        ],
        blockquote: {
          text: "When artwork is printed directly onto the architectural substrate, the wall stops acting as a background and becomes the story itself.",
          attribution: "ATELIER — WALL STORY Editorial Note",
        },
      },
    ],
    tags: ["3d-wall-printing", "murals", "architecture", "mumbai", "walls"],
    authorLabel: null,
    publishedAtLabel: "Atelier Studio Journal",
    publishedIso: null,
    featured: true,
    published: true,
    isEditorialFixture: true,
    seo: {
      metaTitle:
        "Direct-to-Surface 3D Wall Printing & Interior Architecture | ATELIER — WALL STORY",
      metaDescription:
        "Explore how direct-to-surface 3D wall printing brings seamless murals and conceptual wall art to interior spaces in Mumbai.",
      ogImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-direct-to-surface-printing-cover.webp",
    },
  },
  {
    id: "blog-fixture-02",
    title:
      "Six Architectural Surfaces: Extending Wall Art to Tiles, Plywood, Blinds, Metals & Glass",
    slug: "six-architectural-surfaces-tiles-plywood-blinds-metals-glass",
    categorySlug: "materials",
    categoryName: "Materials",
    excerpt:
      "A closer look at the six confirmed substrates supported by ATELIER — WALL STORY—and how multi-surface printing unifies residential and commercial interiors.",
    coverImage: {
      publicId: "blogs/fixture-02-cover",
      secureUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-six-surfaces-cover.webp",
      resourceType: "image",
      width: 1600,
      height: 1000,
      format: "jpg",
      altText: "Plaster, tile, plywood, blind fabric, metal and glass samples each printed with the same sage leaf motif",
    },
    sections: [
      {
        heading: "Why Surface Continuity Matters in Interior Design",
        paragraphs: [
          "Modern interiors rarely consist of plastered walls alone. Contemporary residences and studios in Mumbai weave together ceramic tiles, warm plywood millwork, commercial roller blinds, brushed metal panels, and glass partitions.",
          "When surface art is restricted to paper or canvas, these materials remain visually disconnected. Direct multi-surface printing allows a curated visual language to flow across all six substrates.",
        ],
        figure: {
          imageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-surface-continuity.webp",
          altText: "One terracotta botanical artwork flowing from plaster wall across tiled backsplash onto plywood cabinets",
          caption:
            "Multi-Surface Study — Coordinating Wall, Tile, and Plywood Elevations.",
        },
      },
      {
        heading: "Selecting the Right Composition for Each Substrate",
        paragraphs: [
          "Fine botanical line work and geometric grids lend subtle privacy to interior glass partitions and office blinds, while tactile mineral and constructivist compositions bring warmth to tiled walls and plywood cabinetry.",
        ],
      },
    ],
    tags: ["materials", "tiles", "plywood", "office-blinds", "metals", "glass"],
    authorLabel: null,
    publishedAtLabel: "Atelier Studio Journal",
    publishedIso: null,
    featured: false,
    published: true,
    isEditorialFixture: true,
    seo: {
      metaTitle:
        "Six Architectural Surfaces for 3D Printing | ATELIER — WALL STORY",
      metaDescription:
        "Discover how ATELIER — WALL STORY prints directly onto walls, tiles, plywood, office blinds, metals, and glass.",
      ogImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-six-surfaces-cover.webp",
    },
  },
  {
    id: "blog-fixture-03",
    title:
      "Choosing Between Full-Wall Murals and Repeating Architectural Patterns",
    slug: "choosing-between-full-wall-murals-and-repeating-patterns",
    categorySlug: "design-inspiration",
    categoryName: "Design Inspiration",
    excerpt:
      "How to decide whether your elevation calls for a singular narrative mural or a rhythmic architectural pattern—and how to test both on your wall.",
    coverImage: {
      publicId: "blogs/fixture-03-cover",
      secureUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-murals-vs-patterns-cover.webp",
      resourceType: "image",
      width: 1600,
      height: 1000,
      format: "jpg",
      altText: "Two adjoining rooms contrasting a full-wall misty landscape mural with a small repeating geometric pattern",
    },
    sections: [
      {
        heading: "Singular Focal Point vs. Rhythmic Texture",
        paragraphs: [
          "A full-wall mural acts as the primary visual anchor of a space—ideal for double-height living walls, reception backdrops, and dining elevations where furniture frames the composition.",
          "Repeating architectural patterns, by contrast, establish a continuous textural field that works beautifully along corridors, tiled elevations, and multi-panel partitions.",
        ],
      },
      {
        heading: "Previewing Both Modes Before Commissioning",
        paragraphs: [
          "In our Explore Designs catalogue, each study indicates its recommended projection mode ('mural' or 'pattern') and links directly to our Wall Visualizer so you can inspect the effect on your own room photo.",
        ],
      },
    ],
    tags: ["design-inspiration", "mural", "pattern", "wall-visualizer"],
    authorLabel: null,
    publishedAtLabel: "Atelier Studio Journal",
    publishedIso: null,
    featured: false,
    published: true,
    isEditorialFixture: true,
    seo: {
      metaTitle:
        "Full-Wall Murals vs. Repeating Architectural Patterns | ATELIER — WALL STORY",
      metaDescription:
        "Learn how to choose between bespoke murals and repeating patterns for your wall or surface print.",
      ogImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-murals-vs-patterns-cover.webp",
    },
  },
  {
    id: "blog-fixture-04",
    title:
      "Designing Calm, Expressive Workspaces with Printed Office Blinds and Glass Partitions",
    slug: "designing-expressive-workspaces-office-blinds-glass-partitions",
    categorySlug: "creative-spaces",
    categoryName: "Creative Spaces",
    excerpt:
      "Transforming functional commercial glazing and window blinds into refined architectural statements for Mumbai studios and boardrooms.",
    coverImage: {
      publicId: "blogs/fixture-04-cover",
      secureUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-expressive-workspaces-cover.webp",
      resourceType: "image",
      width: 1600,
      height: 1000,
      format: "jpg",
      altText: "Office floor with printed frosted glass meeting-room partitions and printed roller blinds along the windows",
    },
    sections: [
      {
        heading: "Rethinking Commercial Window Blinds and Glazing",
        paragraphs: [
          "Office roller blinds and cabin glass partitions occupy some of the largest vertical square footage in modern workspaces, yet they are almost always left blank.",
          "By printing understated geometric compositions or conceptual art directly onto office blinds and glass dividers, studios and executive offices can unify daylight control with brand and spatial identity.",
        ],
      },
    ],
    tags: ["creative-spaces", "office-blinds", "glass", "workspaces", "mumbai"],
    authorLabel: null,
    publishedAtLabel: "Atelier Studio Journal",
    publishedIso: null,
    featured: false,
    published: true,
    isEditorialFixture: true,
    seo: {
      metaTitle:
        "Printed Office Blinds & Glass Partitions for Workspaces | ATELIER — WALL STORY",
      metaDescription:
        "Explore how direct surface printing transforms office blinds and glass partitions in modern workspaces.",
      ogImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-expressive-workspaces-cover.webp",
    },
  },
  {
    id: "blog-fixture-05",
    title:
      "Inside the Unified 12-Category Catalogue & Wall Visualizer Workflow",
    slug: "inside-unified-13-category-catalogue-wall-visualizer-workflow",
    categorySlug: "company-updates",
    categoryName: "Company Updates",
    excerpt:
      "An overview of how ATELIER — WALL STORY organizes 12 curated design categories on one page and connects them to interactive wall previews.",
    coverImage: {
      publicId: "blogs/fixture-05-cover",
      secureUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-catalogue-visualizer-cover.webp",
      resourceType: "image",
      width: 1600,
      height: 1000,
      format: "jpg",
      altText: "Tablet on a stand previewing a botanical mural over the blank living-room wall behind it",
    },
    sections: [
      {
        heading: "One Unified Page for All 12 Design Categories",
        paragraphs: [
          "Rather than fragmenting artwork across dozens of separate subpages, our Explore Designs experience brings all 12 studio categories together on a single interactive page with instant category filtering, search, and high-resolution zoom previews.",
          "From any artwork card or modal preview, visitors can stage a design for wall visualization or send a direct enquiry with the selected design reference attached automatically.",
        ],
      },
    ],
    tags: ["company-updates", "explore-designs", "12-categories", "visualizer"],
    authorLabel: null,
    publishedAtLabel: "Atelier Studio Journal",
    publishedIso: null,
    featured: false,
    published: true,
    isEditorialFixture: true,
    seo: {
      metaTitle:
        "Unified 12-Category Catalogue & Wall Visualizer | ATELIER — WALL STORY",
      metaDescription:
        "How ATELIER — WALL STORY connects 12 design categories with live wall visualization and direct Mumbai studio consultations.",
      ogImageUrl: "https://res.cloudinary.com/y6kgj4yr/image/upload/f_auto,q_auto/atelier-wall-story/blogs/journal/journal-catalogue-visualizer-cover.webp",
    },
  },
];

export const DEVELOPMENT_BLOG_FIXTURES: ReadonlyArray<BlogArticleRecord> =
  RAW_EDITORIAL_FIXTURES.map((item) => ({
    ...item,
    readingTimeMinutes: computeReadingTimeMinutes(item.sections, item.excerpt),
  }));

export function findBlogBySlugOrId(
  identifier?: string | null,
  source: ReadonlyArray<BlogArticleRecord> = []
): BlogArticleRecord | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  return (
    source.find(
      (post) =>
        post.slug.toLowerCase() === clean || post.id.toLowerCase() === clean
    ) ?? null
  );
}

export function filterBlogArticles(
  articles: ReadonlyArray<BlogArticleRecord>,
  options: {
    categorySlug?: string | null;
    searchQuery?: string;
  }
): BlogArticleRecord[] {
  const cat = options.categorySlug?.trim().toLowerCase() || "all";
  const query = options.searchQuery?.trim().toLowerCase() || "";

  return articles.filter((post) => {
    if (!post.published) return false;
    const matchesCat =
      cat === "all" || post.categorySlug.toLowerCase() === cat;
    if (!matchesCat) return false;
    if (!query) return true;

    const hay = [
      post.title,
      post.excerpt,
      post.categoryName,
      ...post.tags,
      ...post.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ]
      .join(" ")
      .toLowerCase();

    return hay.includes(query);
  });
}
