import assert from "node:assert/strict";
import test from "node:test";
import { getHeroHeadingBeforeHighlight } from "../src/lib/hero-copy";

test("removes a repeated trailing accent from the plain hero line", () => {
  assert.equal(
    getHeroHeadingBeforeHighlight(
      "Real Spaces, Lasting Impressions.",
      "Lasting Impressions.",
    ),
    "Real Spaces,",
  );
});

test("keeps non-trailing or absent accent text unchanged", () => {
  assert.equal(getHeroHeadingBeforeHighlight("Visualize the Design", "Own Space."), "Visualize the Design");
  assert.equal(getHeroHeadingBeforeHighlight("Explore Wall Art", null), "Explore Wall Art");
});
