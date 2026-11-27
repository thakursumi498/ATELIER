import test from "node:test";
import assert from "node:assert/strict";
import { canToggleManagedAsset, cloudinaryDeliveryUrl, humanizeMediaDisplayName, signCloudinary } from "../src/lib/media-store";
import { GET, PATCH, DELETE } from "../src/app/api/admin/media/route";
import { POST } from "../src/app/api/admin/upload/route";

test("Cloudinary delivery only builds URLs for the managed project folder", () => {
  assert.equal(cloudinaryDeliveryUrl("atelier-wall-story/home/hero", "demo-cloud"), "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/atelier-wall-story/home/hero.webp");
  assert.equal(cloudinaryDeliveryUrl("unmanaged/other"), "");
});

test("cloud upload signatures do not depend on parameter insertion order", () => {
  assert.equal(signCloudinary({ public_id: "atelier-wall-story/example", timestamp: "123456" }, "test-secret"), signCloudinary({ timestamp: "123456", public_id: "atelier-wall-story/example" }, "test-secret"));
  assert.notEqual(signCloudinary({ public_id: "atelier-wall-story/example", timestamp: "123456" }, "test-secret"), signCloudinary({ public_id: "atelier-wall-story/example", timestamp: "123457" }, "test-secret"));
});

test("image display names humanize stored technical filenames without changing their identifiers", () => {
  assert.equal(humanizeMediaDisplayName("visualizer-room-neutral-living"), "Living Room");
  assert.equal(humanizeMediaDisplayName("visualizer-room-cream-bedroom.webp"), "Bedroom");
  assert.equal(humanizeMediaDisplayName("botanical-wall-art.jpg"), "Botanical Wall Art");
});

test("visibility changes are limited to design images and unreferenced website images", () => {
  assert.equal(canToggleManagedAsset({ categorySlug: "nature-and-environment", references: [{ sourcePath: "", page: "", section: "", categorySlug: "", categoryCode: "" }] }), true);
  assert.equal(canToggleManagedAsset({ categorySlug: "nature-and-environment", references: [{ sourcePath: "", page: "home", section: "hero", categorySlug: "", categoryCode: "" }] }), false);
  assert.equal(canToggleManagedAsset({ categorySlug: "nature-and-environment", references: [{ sourcePath: "", page: "explore-designs", section: "catalogue", categorySlug: "", categoryCode: "" }] }), true);
  assert.equal(canToggleManagedAsset({ categorySlug: "", references: [{ sourcePath: "", page: "home", section: "hero", categorySlug: "", categoryCode: "" }] }), false);
  assert.equal(canToggleManagedAsset({ categorySlug: "", references: [] }), true);
  assert.equal(canToggleManagedAsset({ categorySlug: "", references: [], placement: "visualizer", context: { page: "visualizer", section: "wall-preview" } }), false);
});

test("all media operations reject unauthenticated callers before touching storage", async () => {
  for (const [method, handler] of [["GET", GET], ["PATCH", PATCH], ["DELETE", DELETE], ["POST", POST]] as const) {
    const response = await handler(new Request("https://atelier.example/api/admin/media", { method }));
    assert.equal(response.status, 401, `${method} must require a session`);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    assert.equal((await response.json()).ok, false);
  }
});
