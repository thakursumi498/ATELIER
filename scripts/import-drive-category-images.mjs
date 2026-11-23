import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const categories = [
  {
    name: "Arts and entertainment",
    slug: "arts-and-entertainment",
    description:
      "Culture, film, music, and creative inspiration for expressive feature walls.",
  },
  {
    name: "Food and lifestyle",
    slug: "food-and-lifestyle",
    description:
      "Food, dining, and everyday lifestyle imagery for warm, characterful spaces.",
  },
  {
    name: "Graffiti",
    slug: "graffiti",
    description:
      "Street art and graphic lettering for bold statement walls.",
  },
  {
    name: "History",
    slug: "history",
    description:
      "Historical scenes and heritage-inspired artwork for character-rich interiors.",
  },
  {
    name: "Kids education",
    slug: "kids-education",
    description:
      "Playful educational artwork for children's rooms, schools, and learning spaces.",
  },
  {
    name: "Logo",
    slug: "logo",
    description:
      "Custom brand and identity artwork for studios, workplaces, and commercial spaces.",
  },
  {
    name: "Motivation",
    slug: "motivation",
    description:
      "Positive messages and uplifting imagery for personal and shared spaces.",
  },
  {
    name: "Nature and environment",
    slug: "nature-and-environment",
    description:
      "Nature-led artwork celebrating landscapes, plants, and environmental themes.",
  },
  {
    name: "Optical illusions",
    slug: "optical-illusions",
    description:
      "Perspective, pattern, and visual trick artwork for playful feature walls.",
  },
  {
    name: "science and technology",
    slug: "science-and-technology",
    description:
      "Science and technology visuals for modern learning and workspaces.",
  },
  {
    name: "Sports",
    slug: "sports",
    description:
      "Sports-inspired artwork for energetic, team, and training spaces.",
  },
  {
    name: "Textures",
    slug: "textures",
    description:
      "Tactile patterns and surface studies for layered interior compositions.",
  },
  {
    name: "Wildlife",
    slug: "wildlife",
    description:
      "Wildlife imagery and animal-led artwork for bold, nature-connected interiors.",
  },
];

const supportedExtensions = new Set([
  ".ai",
  ".avif",
  ".bmp",
  ".eps",
  ".gif",
  ".jfif",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".psb",
  ".psd",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);

const inputRoot = process.argv[2];
if (!inputRoot) {
  throw new Error(
    "Usage: node scripts/import-drive-category-images.mjs <extracted-drive-folder>",
  );
}

const sourceRoot = path.resolve(inputRoot);
const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(
  projectRoot,
  "public/images/atelier/drive-categories",
);
const manifestPath = path.join(
  projectRoot,
  "src/lib/drive-category-assets.ts",
);

async function findCategoryFolders(directory, categoryName, found = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return found;
  }

  const categoryMatches = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      entry.name.trim().toLowerCase() === categoryName.toLowerCase(),
  );
  if (categoryMatches.length) {
    for (const match of categoryMatches) {
      found.push(path.join(directory, match.name));
    }
    return found;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await findCategoryFolders(
        path.join(directory, entry.name),
        categoryName,
        found,
      );
    }
  }
  return found;
}

async function collectImageFiles(directory, categoryRoot, found = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectImageFiles(fullPath, categoryRoot, found);
      continue;
    }

    if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
      found.push({
        fullPath,
        relativePath: path.relative(categoryRoot, fullPath),
      });
    }
  }
  return found;
}

async function hashFile(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function makeTitle(relativePath) {
  const baseName = path.basename(relativePath, path.extname(relativePath));
  const title = baseName
    .replace(/[_.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return title || "Untitled design";
}

function makeSubCategory(relativePath) {
  const directory = path.dirname(relativePath);
  if (directory !== ".") return directory.split(path.sep).join(" / ");

  const baseName = path.basename(relativePath, path.extname(relativePath));
  const numberedDesign = baseName.match(/^design\s*-\s*(\d+)/iu);
  if (numberedDesign) return `Design - ${numberedDesign[1]}`;
  const spacedDesign = baseName.match(/^design\s+(\d+)/iu);
  if (spacedDesign) return `Design ${spacedDesign[1]}`;
  const natureOrWildlife = baseName.match(/^(nature|wildlife)\s+\d+/iu);
  if (natureOrWildlife) {
    return natureOrWildlife[1].toLowerCase() === "wildlife"
      ? "Wildlife"
      : "Nature";
  }

  return "Main collection";
}

await mkdir(outputRoot, { recursive: true });

const importedCategories = [];
const globalImageByHash = new Map();
for (const [categoryIndex, category] of categories.entries()) {
  const categoryFolders = await findCategoryFolders(sourceRoot, category.name);
  const candidates = [];
  for (const folder of categoryFolders) {
    await collectImageFiles(folder, folder, candidates);
  }
  candidates.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, {
      sensitivity: "base",
    }) || a.fullPath.localeCompare(b.fullPath, undefined, { sensitivity: "base" }),
  );

  const categoryOutput = path.join(outputRoot, category.slug);
  await mkdir(categoryOutput, { recursive: true });
  const seenHashes = new Set();
  const images = [];

  for (const candidate of candidates) {
    let quickLookDirectory;
    try {
      const digest = await hashFile(candidate.fullPath);
      if (seenHashes.has(digest)) continue;
      seenHashes.add(digest);

      const code = `AE${String(categoryIndex + 1).padStart(2, "0")}-${String(images.length + 1).padStart(2, "0")}`;
      const existingImage = globalImageByHash.get(digest);
      if (existingImage) {
        images.push({
          ...existingImage,
          code,
          title: makeTitle(candidate.relativePath),
          sourceName: candidate.relativePath,
          subCategory: makeSubCategory(candidate.relativePath),
        });
        continue;
      }

      const outputPath = path.join(categoryOutput, `${code}.webp`);
      let previewSource = candidate.fullPath;
      const extension = path.extname(candidate.fullPath).toLowerCase();
      if (extension === ".psb") {
        quickLookDirectory = await mkdtemp(
          path.join(os.tmpdir(), "atelier-drive-preview-"),
        );
        previewSource = path.join(quickLookDirectory, "preview.png");
        execFileSync(
          "sips",
          ["-s", "format", "png", "-Z", "2400", candidate.fullPath, "--out", previewSource],
          { stdio: "ignore" },
        );
      } else if ([".ai", ".eps", ".pdf", ".psd"].includes(extension)) {
        quickLookDirectory = await mkdtemp(
          path.join(os.tmpdir(), "atelier-drive-preview-"),
        );
        execFileSync(
          "qlmanage",
          ["-t", "-s", "2400", "-o", quickLookDirectory, candidate.fullPath],
          { stdio: "ignore" },
        );
        const previewFile = (await readdir(quickLookDirectory)).find((name) =>
          /\.(png|jpe?g|webp)$/iu.test(name),
        );
        if (!previewFile) throw new Error("Quick Look could not render a preview");
        previewSource = path.join(quickLookDirectory, previewFile);
      }

      const metadata = await sharp(previewSource, {
        animated: false,
        failOn: "none",
      })
        .rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 5, alphaQuality: 90 })
        .toFile(outputPath);

      const image = {
        code,
        title: makeTitle(candidate.relativePath),
        sourceName: candidate.relativePath,
        subCategory: makeSubCategory(candidate.relativePath),
        url: `/images/atelier/drive-categories/${category.slug}/${code}.webp`,
        width: metadata.width,
        height: metadata.height,
        format: "webp",
      };
      images.push(image);
      globalImageByHash.set(digest, image);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `Skipped ${category.name}/${candidate.relativePath}: ${message}\n`,
      );
    } finally {
      if (quickLookDirectory) {
        await rm(quickLookDirectory, { recursive: true, force: true });
      }
    }
  }

  importedCategories.push({
    ...category,
    slotNumber: categoryIndex + 1,
    slotCode: `CAT-${String(categoryIndex + 1).padStart(2, "0")}`,
    images,
  });
  process.stdout.write(`${category.name}: ${images.length} images\n`);
}

const manifest = `export interface DriveCategoryImageAsset {\n  code: string;\n  title: string;\n  sourceName: string;\n  subCategory: string;\n  url: string;\n  width: number;\n  height: number;\n  format: "webp";\n}\n\nexport interface DriveCategoryAsset {\n  name: string;\n  slug: string;\n  description: string;\n  slotNumber: number;\n  slotCode: string;\n  images: ReadonlyArray<DriveCategoryImageAsset>;\n}\n\nexport const DRIVE_CATEGORY_ASSETS: ReadonlyArray<DriveCategoryAsset> = ${JSON.stringify(importedCategories, null, 2)};\n`;

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, manifest, "utf8");

process.stdout.write(
  `Wrote ${path.relative(projectRoot, manifestPath)} and optimized images under ${path.relative(projectRoot, outputRoot)}.\n`,
);
