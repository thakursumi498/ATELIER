import assert from "node:assert/strict";
import { test } from "node:test";
import { DEVELOPMENT_FIXTURE_DESIGNS, DESIGN_CATEGORY_RECORDS, mergeManagedCategoryImages, mergeManagedDesignImages, type ManagedCatalogueImage } from "../src/lib/designs-catalogue";

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
