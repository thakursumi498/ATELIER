import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAtelierVaultCategories, DEVELOPMENT_FIXTURE_DESIGNS, DESIGN_CATEGORY_RECORDS, isDuplicateSourceArtwork, mergeManagedCategoryImages, mergeManagedDesignImages, type ManagedCatalogueImage } from "../src/lib/designs-catalogue";
import { DRIVE_CATEGORY_ASSETS } from "../src/lib/drive-category-assets";
import { DEVELOPMENT_PROJECT_FIXTURES, projectExhibitionImage } from "../src/lib/projects-catalogue";

const firstDesign = DEVELOPMENT_FIXTURE_DESIGNS[0];
const managedImage = (overrides: Partial<ManagedCatalogueImage> = {}): ManagedCatalogueImage => ({
  id: "managed-image",
  publicId: `atelier-wall-story/designs/categories/${firstDesign.categorySlug}/${firstDesign.artworkCode}`,
  secureUrl: "https://res.cloudinary.com/example/image/upload/f_auto,q_auto/atelier-wall-story/designs/categories/example/AE01-01.webp",
  altText: "Managed artwork",
  width: 1200,
  height: 800,
  format: "webp",
  categorySlug: firstDesign.categorySlug,
  artworkCode: firstDesign.artworkCode || "AE01-01",
  displayOrder: 4,
  active: true,
  ...overrides,
});

test("project exhibition uses an existing alternate when it repeats the cover image", () => {
  for (const project of DEVELOPMENT_PROJECT_FIXTURES) {
    const exhibitionImage = projectExhibitionImage(project);
    assert.ok(exhibitionImage);
    if (project.exhibitionImage === project.coverImage.secureUrl) {
      assert.notEqual(exhibitionImage, project.coverImage.secureUrl);
    }
  }
});

test("managed Cloudinary image metadata replaces catalogue image URLs and dimensions", () => {
  const merged = mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, [managedImage()]);
  const design = merged.find((item) => item.artworkCode === firstDesign.artworkCode && item.categorySlug === firstDesign.categorySlug);
  assert.ok(design);
  assert.equal(design.coverImage.secureUrl, managedImage().secureUrl);
  assert.equal(design.visualizerConfig.textureUrl, managedImage().secureUrl);
  assert.equal(design.coverImage.width, 1200);
  assert.equal(design.sortOrder, 4);
});

test("inactive managed artwork is hidden and newly uploaded art uses static category copy", () => {
  const category = DESIGN_CATEGORY_RECORDS.find((item) => item.slug !== firstDesign.categorySlug)!;
  const hiddenCode = firstDesign.artworkCode || "AE01-01";
  const hidden = managedImage({ active: false });
  const added = managedImage({ categorySlug: category.slug, artworkCode: `AE${String(category.slotNumber).padStart(2, "0")}-99`, publicId: `atelier-wall-story/designs/categories/${category.slug}/new-art`, altText: "New art", displayOrder: 2 });
  const merged = mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, [hidden, added]);
  assert.equal(merged.some((item) => item.categorySlug === firstDesign.categorySlug && item.artworkCode === hiddenCode), false);
  const newDesign = merged.find((item) => item.categorySlug === category.slug && item.artworkCode === added.artworkCode);
  assert.ok(newDesign);
  assert.equal(newDesign.categoryLabel, category.name);
  assert.equal(newDesign.coverImage.secureUrl, added.secureUrl);
});

test("managed category artwork updates its cover without changing static category copy", () => {
  const image = managedImage();
  const before = DESIGN_CATEGORY_RECORDS.find((item) => item.slug === image.categorySlug)!;
  const [category] = mergeManagedCategoryImages([before], [image]);
  assert.equal(category.name, before.name);
  assert.equal(category.description, before.description);
  assert.equal(category.coverImage?.secureUrl, image.secureUrl);
});

test("the category cover artwork is also present inside its gallery", () => {
  const sourceImages: ManagedCatalogueImage[] = DRIVE_CATEGORY_ASSETS.flatMap((category) =>
    category.images.map((image, index) => ({
      id: `source-${image.code}`,
      publicId: `atelier-wall-story/designs/categories/${category.slug}/${image.code}`,
      secureUrl: image.url,
      altText: `${category.name}: ${image.title}`,
      width: image.width,
      height: image.height,
      format: image.format,
      categorySlug: category.slug,
      artworkCode: image.code,
      displayOrder: index + 1,
      active: true,
      placement: "design",
    })),
  );
  const designs = mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, sourceImages);
  const categories = mergeManagedCategoryImages(DESIGN_CATEGORY_RECORDS, sourceImages);
  const vaultCategories = buildAtelierVaultCategories(categories, designs);

  assert.ok(designs.some((design) => design.categorySlug === "arts-and-entertainment"));
  for (const category of vaultCategories) {
    const categoryDesigns = designs.filter((design) => design.categorySlug === category.slug);
    if (!categoryDesigns.length) {
      assert.equal(category.coverImage, "", `${category.title} has a cover without a gallery design`);
      continue;
    }
    assert.ok(
      categoryDesigns.some((design) => design.coverImage.secureUrl === category.coverImage),
      `${category.title} cover is missing from its gallery`,
    );
  }
});

test("duplicate source exports are removed while new uploads and archived logos stay available", () => {
  assert.equal(isDuplicateSourceArtwork("motivation", "AE07-02"), true);
  assert.equal(isDuplicateSourceArtwork("nature-and-environment", "AE08-05"), true);
  assert.equal(isDuplicateSourceArtwork("motivation", "AE07-01"), false);
  assert.equal(isDuplicateSourceArtwork("motivation", "AE07-99"), false);
  assert.equal(isDuplicateSourceArtwork("logo", "AE06-03"), false);
});

test("moving a static artwork suppresses its old catalogue placement and publishes the new subcategory", () => {
  const destination = DESIGN_CATEGORY_RECORDS.find((item) => item.slug === "food-and-lifestyle")!;
  const originalCode = firstDesign.artworkCode || "AE01-01";
  const moved = managedImage({
    id: "moved-artwork",
    publicId: "atelier-wall-story/designs/food-and-lifestyle/design-1/AE02-05",
    secureUrl: "https://res.cloudinary.com/example/image/upload/f_auto,q_auto/atelier-wall-story/designs/food-and-lifestyle/design-1/AE02-05.webp",
    categorySlug: destination.slug,
    artworkCode: "AE02-05",
    subcategorySlug: "design-1",
    subcategoryName: "Design - 1",
    replacesCategorySlug: firstDesign.categorySlug,
    replacesArtworkCode: originalCode,
  });
  const merged = mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, [moved]);

  assert.equal(merged.some((item) => item.categorySlug === firstDesign.categorySlug && item.artworkCode === originalCode), false);
  const movedDesign = merged.find((item) => item.categorySlug === destination.slug && item.artworkCode === "AE02-05");
  assert.ok(movedDesign);
  assert.equal(movedDesign.subCategoryLabel, "Design - 1");
});
