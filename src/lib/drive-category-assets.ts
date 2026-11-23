export interface DriveCategoryImageAsset {
  code: string;
  title: string;
  sourceName: string;
  subCategory: string;
  url: string;
  width: number;
  height: number;
  format: "webp";
}

export interface DriveCategoryAsset {
  name: string;
  slug: string;
  description: string;
  slotNumber: number;
  slotCode: string;
  images: ReadonlyArray<DriveCategoryImageAsset>;
}

export const DRIVE_CATEGORY_ASSETS: ReadonlyArray<DriveCategoryAsset> = [
  {
    "name": "Arts and entertainment",
    "slug": "arts-and-entertainment",
    "description": "Culture, film, music, and creative inspiration for expressive feature walls.",
    "slotNumber": 1,
    "slotCode": "CAT-01",
    "images": [
      {
        "code": "AE01-01",
        "title": "Design 1 CMYK 005",
        "sourceName": "Design 1/Design 1 - CMYK-005.psb",
        "url": "/images/atelier/drive-categories/arts-and-entertainment/AE01-01.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design 1"
      }
    ]
  },
  {
    "name": "Food and lifestyle",
    "slug": "food-and-lifestyle",
    "description": "Food, dining, and everyday lifestyle imagery for warm, characterful spaces.",
    "slotNumber": 2,
    "slotCode": "CAT-02",
    "images": [
      {
        "code": "AE02-01",
        "title": "Design 1",
        "sourceName": "Design - 1.jpg",
        "url": "/images/atelier/drive-categories/food-and-lifestyle/AE02-01.webp",
        "width": 1478,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE02-02",
        "title": "Design CMYK",
        "sourceName": "Design - 1/Design - CMYK.psd",
        "url": "/images/atelier/drive-categories/food-and-lifestyle/AE02-02.webp",
        "width": 1478,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE02-03",
        "title": "Transparent BG CMYK",
        "sourceName": "Design - 1/Transparent BG---CMYK.pdf",
        "url": "/images/atelier/drive-categories/food-and-lifestyle/AE02-03.webp",
        "width": 1477,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE02-04",
        "title": "White BG CMYK",
        "sourceName": "Design - 1/White-BG - -CMYK.pdf",
        "url": "/images/atelier/drive-categories/food-and-lifestyle/AE02-04.webp",
        "width": 1356,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      }
    ]
  },
  {
    "name": "Graffiti",
    "slug": "graffiti",
    "description": "Street art and graphic lettering for bold statement walls.",
    "slotNumber": 3,
    "slotCode": "CAT-03",
    "images": []
  },
  {
    "name": "History",
    "slug": "history",
    "description": "Historical scenes and heritage-inspired artwork for character-rich interiors.",
    "slotNumber": 4,
    "slotCode": "CAT-04",
    "images": []
  },
  {
    "name": "Kids education",
    "slug": "kids-education",
    "description": "Playful educational artwork for children's rooms, schools, and learning spaces.",
    "slotNumber": 5,
    "slotCode": "CAT-05",
    "images": [
      {
        "code": "AE05-01",
        "title": "Design 1",
        "sourceName": "Design - 1.jpg",
        "url": "/images/atelier/drive-categories/kids-education/AE05-01.webp",
        "width": 1920,
        "height": 1187,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE05-02",
        "title": "Design CMYK",
        "sourceName": "Design - 1/Design - CMYK.psd",
        "url": "/images/atelier/drive-categories/kids-education/AE05-02.webp",
        "width": 1920,
        "height": 1186,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE05-03",
        "title": "Transparent BG CMYK",
        "sourceName": "Design - 1/Transparent BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/kids-education/AE05-03.webp",
        "width": 1920,
        "height": 1186,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE05-04",
        "title": "White BG CMYK",
        "sourceName": "Design - 1/White BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/kids-education/AE05-04.webp",
        "width": 1920,
        "height": 1186,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE05-05",
        "title": "Design 2 (2)",
        "sourceName": "Design - 2 (2).jpg",
        "url": "/images/atelier/drive-categories/kids-education/AE05-05.webp",
        "width": 1478,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE05-06",
        "title": "Design 2",
        "sourceName": "Design - 2.jpg",
        "url": "/images/atelier/drive-categories/kids-education/AE05-06.webp",
        "width": 1478,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE05-07",
        "title": "Coloring 1 Transparent BG CMYK",
        "sourceName": "Design - 2/Coloring 1 - Transparent BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/kids-education/AE05-07.webp",
        "width": 1477,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE05-08",
        "title": "Coloring 1 White BG CMYK",
        "sourceName": "Design - 2/Coloring 1 - White BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/kids-education/AE05-08.webp",
        "width": 1477,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE05-09",
        "title": "Coloring 2 Transparent BG CMYK",
        "sourceName": "Design - 2/Coloring 2 - Transparent BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/kids-education/AE05-09.webp",
        "width": 1477,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE05-10",
        "title": "Coloring 2 White BG CMYK",
        "sourceName": "Design - 2/Coloring 2 - White BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/kids-education/AE05-10.webp",
        "width": 1477,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE05-11",
        "title": "Design CMYK",
        "sourceName": "Design - 2/Design - CMYK.psd",
        "url": "/images/atelier/drive-categories/kids-education/AE05-11.webp",
        "width": 1478,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      }
    ]
  },
  {
    "name": "Logo",
    "slug": "logo",
    "description": "Custom brand and identity artwork for studios, workplaces, and commercial spaces.",
    "slotNumber": 6,
    "slotCode": "CAT-06",
    "images": [
      {
        "code": "AE06-01",
        "title": "Atelier Wall Story Brand Board (1)",
        "sourceName": "Atelier Wall Story Brand Board (1).png",
        "url": "/images/atelier/drive-categories/logo/AE06-01.webp",
        "width": 1536,
        "height": 1024,
        "format": "webp",
        "subCategory": "Main collection"
      },
      {
        "code": "AE06-02",
        "title": "Black Logo 01",
        "sourceName": "Black Logo-01.png",
        "url": "/images/atelier/drive-categories/logo/AE06-02.webp",
        "width": 1920,
        "height": 1920,
        "format": "webp",
        "subCategory": "Main collection"
      },
      {
        "code": "AE06-03",
        "title": "Jpeg logo 01",
        "sourceName": "Jpeg logo-01.png",
        "url": "/images/atelier/drive-categories/logo/AE06-03.webp",
        "width": 1920,
        "height": 1920,
        "format": "webp",
        "subCategory": "Main collection"
      },
      {
        "code": "AE06-04",
        "title": "Logo SVG",
        "sourceName": "Logo SVG.svg",
        "url": "/images/atelier/drive-categories/logo/AE06-04.webp",
        "width": 1920,
        "height": 1920,
        "format": "webp",
        "subCategory": "Main collection"
      },
      {
        "code": "AE06-05",
        "title": "Logo Transparent Bg",
        "sourceName": "Logo Transparent Bg.png",
        "url": "/images/atelier/drive-categories/logo/AE06-05.webp",
        "width": 1920,
        "height": 1920,
        "format": "webp",
        "subCategory": "Main collection"
      },
      {
        "code": "AE06-06",
        "title": "logo",
        "sourceName": "logo.ai",
        "url": "/images/atelier/drive-categories/logo/AE06-06.webp",
        "width": 1920,
        "height": 1920,
        "format": "webp",
        "subCategory": "Main collection"
      },
      {
        "code": "AE06-07",
        "title": "White Logo 01",
        "sourceName": "White Logo-01.png",
        "url": "/images/atelier/drive-categories/logo/AE06-07.webp",
        "width": 1920,
        "height": 1920,
        "format": "webp",
        "subCategory": "Main collection"
      }
    ]
  },
  {
    "name": "Motivation",
    "slug": "motivation",
    "description": "Positive messages and uplifting imagery for personal and shared spaces.",
    "slotNumber": 7,
    "slotCode": "CAT-07",
    "images": [
      {
        "code": "AE07-01",
        "title": "Design 1",
        "sourceName": "Design - 1.jpg",
        "url": "/images/atelier/drive-categories/motivation/AE07-01.webp",
        "width": 1525,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE07-02",
        "title": "Design",
        "sourceName": "Design - 1/Design.psd",
        "url": "/images/atelier/drive-categories/motivation/AE07-02.webp",
        "width": 1525,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE07-03",
        "title": "Transparent BG CMYK",
        "sourceName": "Design - 1/Transparent - -BG - -CMYK.pdf",
        "url": "/images/atelier/drive-categories/motivation/AE07-03.webp",
        "width": 1356,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE07-04",
        "title": "White BG CMYK 1",
        "sourceName": "Design - 1/White-BG - -CMYK-1.pdf",
        "url": "/images/atelier/drive-categories/motivation/AE07-04.webp",
        "width": 1356,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      }
    ]
  },
  {
    "name": "Nature and environment",
    "slug": "nature-and-environment",
    "description": "Nature-led artwork celebrating landscapes, plants, and environmental themes.",
    "slotNumber": 8,
    "slotCode": "CAT-08",
    "images": [
      {
        "code": "AE08-01",
        "title": "Transparent BG CMYK",
        "sourceName": "Design - 1/Transparent BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-01.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE08-02",
        "title": "White BG CMYK",
        "sourceName": "Design - 1/White BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-02.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 1"
      },
      {
        "code": "AE08-03",
        "title": "Design 2 CMYK",
        "sourceName": "Design - 2/Design 2 - CMYK.psd",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-03.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE08-04",
        "title": "Transparent CMYK",
        "sourceName": "Design - 2/Transparent - CMYK.pdf",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-04.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE08-05",
        "title": "WHITE BG CMYK",
        "sourceName": "Design - 2/WHITE BG - CMYK.pdf",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-05.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design - 2"
      },
      {
        "code": "AE08-06",
        "title": "Nature 1",
        "sourceName": "Nature 1.png",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-06.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Nature"
      },
      {
        "code": "AE08-07",
        "title": "Nature 2",
        "sourceName": "Nature 2.png",
        "url": "/images/atelier/drive-categories/nature-and-environment/AE08-07.webp",
        "width": 1449,
        "height": 1920,
        "format": "webp",
        "subCategory": "Nature"
      }
    ]
  },
  {
    "name": "Optical illusions",
    "slug": "optical-illusions",
    "description": "Perspective, pattern, and visual trick artwork for playful feature walls.",
    "slotNumber": 9,
    "slotCode": "CAT-09",
    "images": []
  },
  {
    "name": "science and technology",
    "slug": "science-and-technology",
    "description": "Science and technology visuals for modern learning and workspaces.",
    "slotNumber": 10,
    "slotCode": "CAT-10",
    "images": []
  },
  {
    "name": "Sports",
    "slug": "sports",
    "description": "Sports-inspired artwork for energetic, team, and training spaces.",
    "slotNumber": 11,
    "slotCode": "CAT-11",
    "images": []
  },
  {
    "name": "Textures",
    "slug": "textures",
    "description": "Tactile patterns and surface studies for layered interior compositions.",
    "slotNumber": 12,
    "slotCode": "CAT-12",
    "images": []
  },
  {
    "name": "Wildlife",
    "slug": "wildlife",
    "description": "Wildlife imagery and animal-led artwork for bold, nature-connected interiors.",
    "slotNumber": 13,
    "slotCode": "CAT-13",
    "images": [
      {
        "code": "AE13-01",
        "title": "elephant (2)",
        "sourceName": "Design 1/elephant (2).pdf",
        "url": "/images/atelier/drive-categories/wildlife/AE13-01.webp",
        "width": 1071,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design 1"
      },
      {
        "code": "AE13-02",
        "title": "elephant 2",
        "sourceName": "Design 1/elephant 2.psd",
        "url": "/images/atelier/drive-categories/wildlife/AE13-02.webp",
        "width": 1072,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design 1"
      },
      {
        "code": "AE13-03",
        "title": "elephant 3",
        "sourceName": "Design 1/elephant 3.pdf",
        "url": "/images/atelier/drive-categories/wildlife/AE13-03.webp",
        "width": 1071,
        "height": 1920,
        "format": "webp",
        "subCategory": "Design 1"
      },
      {
        "code": "AE13-04",
        "title": "Tiger Wall Art",
        "sourceName": "Design 2/Tiger Wall Art.psd",
        "url": "/images/atelier/drive-categories/wildlife/AE13-04.webp",
        "width": 1920,
        "height": 1536,
        "format": "webp",
        "subCategory": "Design 2"
      },
      {
        "code": "AE13-05",
        "title": "WildLife 1",
        "sourceName": "WildLife 1.png",
        "url": "/images/atelier/drive-categories/wildlife/AE13-05.webp",
        "width": 1072,
        "height": 1920,
        "format": "webp",
        "subCategory": "Wildlife"
      },
      {
        "code": "AE13-06",
        "title": "WildLife 2",
        "sourceName": "WildLife 2.png",
        "url": "/images/atelier/drive-categories/wildlife/AE13-06.webp",
        "width": 1920,
        "height": 1536,
        "format": "webp",
        "subCategory": "Wildlife"
      }
    ]
  }
];
