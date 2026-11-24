import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAdminImageTaxonomy,
  getAssetSectionSlugs,
  getDesignSubcategory,
} from "../src/lib/admin-image-taxonomy";

test("admin taxonomy keeps every configured category and exact subcategory label, including empty categories", () => {
  const taxonomy = buildAdminImageTaxonomy([]);
  assert.equal(taxonomy.categories.length, 13);

  const arts = taxonomy.categories.find((category) => category.slug === "arts-and-entertainment");
  assert.deepEqual(arts?.subcategories.map((item) => item.name), ["Design 1"]);
  assert.equal(arts?.imageCount, 0);
  assert.equal(arts?.subcategories[0].imageCount, 0);

  const empty = taxonomy.categories.find((category) => category.slug === "graffiti");
  assert.equal(empty?.imageCount, 0);
  assert.deepEqual(empty?.subcategories, []);

  const retired = taxonomy.categories.find((category) => category.slug === "logo");
  assert.equal(retired?.retired, true);
  assert.deepEqual(retired?.subcategories.map((item) => item.name), ["Main collection"]);
});

test("admin taxonomy counts existing managed images in their real subcategories", () => {
  const taxonomy = buildAdminImageTaxonomy([
    { categorySlug: "kids-education", subcategorySlug: "design-1", sectionSlugs: ["explore-designs"] },
    { categorySlug: "kids-education", subcategorySlug: "design-1", sectionSlugs: ["explore-designs"] },
    { categorySlug: "kids-education", subcategorySlug: "design-2", sectionSlugs: ["explore-designs"] },
  ]);
  const kids = taxonomy.categories.find((category) => category.slug === "kids-education");
  assert.equal(kids?.imageCount, 3);
  assert.deepEqual(kids?.subcategories.map(({ name, imageCount }) => [name, imageCount]), [["Design - 1", 2], ["Design - 2", 1]]);
});

test("existing artwork codes recover their configured subcategory and shared page placement", () => {
  assert.deepEqual(getDesignSubcategory("kids-education", "AE05-09"), {
    name: "Design - 2",
    slug: "design-2",
  });
  assert.deepEqual(
    getAssetSectionSlugs({ categorySlug: "kids-education", placement: "design", references: [{ page: "home" }], context: { page: "explore-designs" } }).sort(),
    ["explore-designs", "home"],
  );
  assert.deepEqual(
    getAssetSectionSlugs({ placement: "miscellaneous", context: { page: "miscellaneous" }, references: [{ page: "miscellaneous", sourceFiles: ["src/components/home/HeroVideoStage.tsx"] }] }).sort(),
    ["home", "other"],
  );
});
