import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { scryptSync, randomBytes, createHmac, createHash } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getDb } from "../src/lib/mongodb";
import { buildSessionCookieHeader, getActiveAdminSession, persistAdminSession, requireAdminRequest, revokeAdminSession, signAdminSessionToken, verifyAdminCredentials, verifyAdminLoginCredentials, verifyAdminSessionToken } from "../src/lib/admin-auth";
import { DELETE as adminLogout, PATCH as changeAdminPassword, POST as adminLogin } from "../src/app/api/admin/auth/route";
import { checkSameOrigin, RequestError, readJsonBody } from "../src/lib/request-security";
import { DELETE as deleteEnquiry, GET as listEnquiries, PATCH as patchEnquiry, csvCell } from "../src/app/api/admin/enquiries/route";
import { GET as getOverview } from "../src/app/api/admin/overview/route";
import { POST as uploadAdminImage } from "../src/app/api/admin/upload/route";
import { GET as getAdminMedia, PATCH as patchAdminMedia, DELETE as deleteAdminMedia } from "../src/app/api/admin/media/route";
import { GET as getManagedSiteImages } from "../src/app/api/site-images/route";
import { POST as submitEnquiry } from "../src/app/api/enquiries/route";
import { POST as emailWebhook } from "../src/app/api/webhooks/resend/route";
import { saveEnquiryRecord, type StoredEnquiryRecord } from "../src/lib/enquiries-store";
import { sendEnquiryNotification, retryPendingEnquiryEmails } from "../src/lib/enquiry-email";
import { DEVELOPMENT_FIXTURE_DESIGNS, mergeManagedDesignImages } from "../src/lib/designs-catalogue";
import { DEVELOPMENT_PROJECT_FIXTURES, mergeManagedProjectImages } from "../src/lib/projects-catalogue";
import { adminMediaKey, type CloudinaryAssetRecord } from "../src/lib/media-store";
import sharp from "sharp";
let mongo: MongoMemoryServer;
const realFetch = globalThis.fetch;
before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri(); process.env.MONGODB_DB_NAME = "security_tests";
  process.env.ADMIN_AUTH_SECRET = "test-secret-at-least-32-characters-long";
  process.env.INITIAL_ADMIN_EMAIL = "admin@example.test";
  process.env.INITIAL_ADMIN_PASSWORD = "correct-test-password";
  process.env.CLOUDINARY_CLOUD_NAME = "atelier-test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-cloudinary-key";
  process.env.CLOUDINARY_API_SECRET = "test-cloudinary-secret";
});
after(async () => {
  globalThis.fetch = realFetch;
  const shared = globalThis as typeof globalThis & { atelierMongo?: Promise<{ close(): Promise<void> }> };
  if (shared.atelierMongo) await (await shared.atelierMongo).close();
  delete shared.atelierMongo;
  await mongo?.stop();
});
function jsonRequest(url: string, body: unknown, method = "POST", cookie?: string, extraHeaders: Record<string, string> = {}) {
  return new Request(url, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...extraHeaders }, body: JSON.stringify(body) });
}
async function adminCookie() { const token = signAdminSessionToken("admin@example.test"); await persistAdminSession(token); return buildSessionCookieHeader(token).split(";")[0]; }
test("unauthenticated enquiry reads and mutations are blocked", async () => {
  assert.equal((await listEnquiries(new Request("http://localhost/api/admin/enquiries"))).status, 401);
  assert.equal((await patchEnquiry(jsonRequest("http://localhost/api/admin/enquiries", { id: "x", status: "Closed" }, "PATCH"))).status, 401);
});
test("sessions require persistent registration and logout revokes a copied cookie", async () => {
  const token = signAdminSessionToken("admin@example.test");
  const request = new Request("http://localhost/api/admin/enquiries", { headers: { cookie: buildSessionCookieHeader(token) } });
  assert.equal(await getActiveAdminSession(request), null);
  await persistAdminSession(token);
  assert.equal((await getActiveAdminSession(request))?.email, "admin@example.test");
  await revokeAdminSession(request);
  assert.equal((await requireAdminRequest(request)).ok, false);
  assert.equal(verifyAdminSessionToken(`${token}bad`), null);

  const logoutCookie = await adminCookie();
  const logout = await adminLogout(new Request("http://localhost/api/admin/auth", { method: "DELETE", headers: { cookie: logoutCookie, Origin: "http://localhost" } }));
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/);
  assert.equal(await getActiveAdminSession(new Request("http://localhost/api/admin/auth", { headers: { cookie: logoutCookie } })), null);
});
test("credentials support scrypt hashes and changing credentials invalidates old tokens", () => {
  const token = signAdminSessionToken("admin@example.test");
  const salt = randomBytes(16).toString("hex");
  process.env.INITIAL_ADMIN_PASSWORD_HASH = `scrypt:${salt}:${scryptSync("hashed-password", Buffer.from(salt, "hex"), 64).toString("hex")}`;
  assert.equal(verifyAdminCredentials("admin@example.test", "hashed-password").ok, true);
  assert.equal(verifyAdminCredentials("admin@example.test", "wrong").ok, false);
  assert.equal(verifyAdminSessionToken(token), null);
  delete process.env.INITIAL_ADMIN_PASSWORD_HASH;
});
test("CSRF, malformed JSON, oversized bodies, and formula cells are handled", async () => {
  assert.throws(() => checkSameOrigin(new Request("http://localhost/api", { headers: { Origin: "https://evil.example" } })), RequestError);
  await assert.rejects(readJsonBody(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })), RequestError);
  await assert.rejects(readJsonBody(jsonRequest("http://localhost/api", { text: "large" }), 2), RequestError);
  for (const cell of ["=1+1", "  +SUM(A1)", "@test", "-1", "\tcmd"]) assert.match(csvCell(cell), /^"'/);
});
test("valid public enquiries persist and responses contain no customer records", async () => {
  const payload = { fullName: "Test Customer", email: "customer@example.test", phone: "+919876543210", message: "A test wall printing project brief.", consentGiven: true, sourcePage: "/contact" };
  const retryKey = "contact-form-retry-01";
  const response = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", payload, "POST", undefined, { "Idempotency-Key": retryKey }));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true); assert.equal(body.enquirySummary, undefined); assert.equal(body.email, undefined);
  assert.equal(await (await getDb()).collection("enquiries").countDocuments({ email: payload.email }), 1);
  const again = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", payload, "POST", undefined, { "Idempotency-Key": retryKey }));
  assert.equal((await again.json()).deduplicated, true);
  assert.equal(await (await getDb()).collection("enquiries").countDocuments({ email: payload.email }), 1);
  const genuineRepeat = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", payload, "POST", undefined, { "Idempotency-Key": "contact-form-new-request-02" }));
  assert.equal((await genuineRepeat.json()).deduplicated, false);
  assert.equal(await (await getDb()).collection("enquiries").countDocuments({ email: payload.email }), 2);
  const invalid = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", { ...payload, email: "invalid" }));
  assert.equal(invalid.status, 400);
});
test("lead assignment, notes, followups and authenticated CSV work", async () => {
  const db = await getDb(); const record = await db.collection("enquiries").findOne({ email: "customer@example.test" }); assert.ok(record);
  const cookie = await adminCookie();
  const response = await patchEnquiry(jsonRequest("http://localhost/api/admin/enquiries", { id: record.id, status: "Follow-up", assignedOwner: "Studio Team", followUpAt: "2020-01-01T09:00:00.000Z", note: "Private note" }, "PATCH", cookie));
  assert.equal(response.status, 200);
  const listing = await listEnquiries(new Request("http://localhost/api/admin/enquiries?overdue=true", { headers: { cookie } }));
  const body = await listing.json(); assert.equal(body.enquiries.length, 1); assert.equal(body.enquiries[0].assignedOwner, "Studio Team");
  assert.equal(body.enquiries[0].adminNotes[0].note, "Private note");
  const submittedDay = String(record.createdAt).slice(0, 10);
  const filtered = await listEnquiries(new Request(`http://localhost/api/admin/enquiries?status=Follow-up&service=${encodeURIComponent("General 3D Wall Printing Enquiry")}&dateFrom=${submittedDay}&dateTo=${submittedDay}&pendingFollowups=true`, { headers: { cookie } }));
  const filteredBody = await filtered.json();
  assert.equal(filteredBody.total, 1);
  assert.equal(filteredBody.enquiries[0].status, "Follow-up");
  const csv = await listEnquiries(new Request("http://localhost/api/admin/enquiries?format=csv", { headers: { cookie } }));
  assert.equal(csv.status, 200); assert.match(csv.headers.get("cache-control") || "", /no-store/); assert.match(await csv.text(), /customer@example.test/);
});
test("enquiry deletion removes only the selected record and records an audit event", async () => {
  const now = new Date().toISOString();
  const record: StoredEnquiryRecord = { id: "enquiry-delete-test", referenceCode: "AWS-DELETE-TEST", fullName: "Delete Test", email: "delete@example.test", phone: "", interestType: "general", serviceOrDesignInterest: "General enquiry", message: "Test record for deletion.", status: "New", adminNotes: [], sourcePage: "/contact", emailNotificationSent: false, createdAt: now, updatedAt: now };
  await saveEnquiryRecord(record);
  const cookie = await adminCookie();
  const response = await deleteEnquiry(new Request(`http://localhost/api/admin/enquiries?id=${record.id}`, { method: "DELETE", headers: { cookie, Origin: "http://localhost" } }));
  assert.equal(response.status, 200);
  assert.equal((await (await getDb()).collection("enquiries").findOne({ id: record.id })), null);
  assert.ok(await (await getDb()).collection("audit_logs").findOne({ action: "lead.deleted", target: record.id }));
});
test("dashboard response includes only the fields needed for recent enquiry cards", async () => {
  const now = new Date().toISOString();
  const record: StoredEnquiryRecord = {
    id: "overview-private-fields",
    referenceCode: "AWS-OVERVIEW-TEST",
    fullName: "Overview Customer",
    email: "overview@example.test",
    phone: "+919876543210",
    interestType: "general",
    serviceOrDesignInterest: "Wall printing",
    message: "A sample project brief.",
    status: "New",
    adminNotes: [],
    sourcePage: "/contact",
    emailNotificationSent: true,
    emailStatus: "failed",
    emailAttempts: 1,
    createdAt: now,
    updatedAt: now,
  };
  Object.assign(record, { emailProviderId: "private-provider-id", emailLastError: "private provider response" });
  await saveEnquiryRecord(record);

  const response = await getOverview(new Request("http://localhost/api/admin/overview", { headers: { cookie: await adminCookie() } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  const enquiry = body.recentEnquiries.find((item: { id: string }) => item.id === record.id);
  assert.ok(enquiry);
  assert.deepEqual(Object.keys(enquiry).sort(), ["createdAt", "fullName", "id", "serviceOrDesignInterest", "status"]);
  assert.doesNotMatch(JSON.stringify(body), /private-provider-id|private provider response|emailProviderId|emailLastError/);
});
test("image upload validates actual image content and requires a public placement", async () => {
  const cookie = await adminCookie();
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 120, g: 20, b: 30 } } }).png().toBuffer();
  const request = (file: Blob, filename: string, placement: string) => {
    const form = new FormData();
    form.append("file", file, filename);
    form.append("placement", placement);
    return new Request("http://localhost/api/admin/upload", { method: "POST", headers: { cookie, Origin: "http://localhost" }, body: form });
  };

  const unassigned = await uploadAdminImage(request(new Blob([new Uint8Array(png)], { type: "image/png" }), "wall.png", "library"));
  assert.equal(unassigned.status, 400);
  assert.match((await unassigned.json()).error, /Open a website gallery/);

  const invalidContent = await uploadAdminImage(request(new Blob(["this is not an image"], { type: "image/png" }), "wall.png", "design"));
  assert.equal(invalidContent.status, 400);
  assert.equal((await invalidContent.json()).error, "Choose a valid JPG, PNG or WebP image.");

  const tooLarge = await uploadAdminImage(request(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" }), "large.png", "design"));
  assert.equal(tooLarge.status, 413);
  assert.match((await tooLarge.json()).error, /larger than 5 MB/);
});

test("image management uploads, retries, replaces, assigns and deletes through an isolated Cloudinary store", async () => {
  const cookie = await adminCookie();
  const previousFetch = globalThis.fetch;
  const cloudAssets = new Map<string, CloudinaryAssetRecord & { bytes: number; secure_url: string }>();
  let failNextCloudinaryUpload = false;
  let failAfterCloudinaryContextUpdate = false;
  const makeContext = (value: string) => Object.fromEntries(value.split("|").filter(Boolean).map((part) => {
    const splitAt = part.indexOf("=");
    return splitAt < 0 ? [part, ""] : [part.slice(0, splitAt), part.slice(splitAt + 1)];
  }));
  const getBodyParams = (body: BodyInit | null | undefined) => body instanceof URLSearchParams ? body : new URLSearchParams(String(body || ""));
  const resourceId = (url: URL) => decodeURIComponent(url.pathname.slice(url.pathname.indexOf("/resources/image/upload/") + "/resources/image/upload/".length).split("?")[0]);
  const deliveryId = (url: URL) => decodeURIComponent(url.pathname.split("/image/upload/f_auto,q_auto/")[1] || "").replace(/\.webp$/, "");

  cloudAssets.set("atelier-wall-story/projects/walls-lotus-residence-cover", {
    public_id: "atelier-wall-story/projects/walls-lotus-residence-cover",
    secure_url: "https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/atelier-wall-story/projects/walls-lotus-residence-cover.webp",
    format: "webp", width: 1200, height: 800, bytes: 4000, tags: ["atelier-site", "projects"],
    context: { custom: { alt: "Wall project cover", page: "projects", section: "projects" } },
  });
  cloudAssets.set("atelier-wall-story/admin-library/loose-image", {
    public_id: "atelier-wall-story/admin-library/loose-image",
    secure_url: "https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/atelier-wall-story/admin-library/loose-image.webp",
    format: "webp", width: 1200, height: 800, bytes: 4000, tags: ["atelier-site", "admin-library"],
    context: { custom: { alt: "Loose garden artwork", original_filename: "garden.webp", placement: "library", page: "admin-library", section: "uploads", active: "false" } },
  });
  cloudAssets.set("atelier-wall-story/home/homepage-banner", {
    public_id: "atelier-wall-story/home/homepage-banner",
    secure_url: "https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/atelier-wall-story/home/homepage-banner.webp",
    format: "webp", width: 1600, height: 700, bytes: 5000, tags: ["atelier-site", "home"],
    context: { custom: { alt: "Homepage banner", page: "home", section: "hero", active: "true" } },
  });
  const legacyDesign = DEVELOPMENT_FIXTURE_DESIGNS.find((design) => design.categorySlug !== "food-and-lifestyle") || DEVELOPMENT_FIXTURE_DESIGNS[0];
  const legacyDesignId = legacyDesign.coverImage.publicId;
  cloudAssets.set(legacyDesignId, {
    public_id: legacyDesignId,
    secure_url: legacyDesign.coverImage.secureUrl,
    format: "webp", width: legacyDesign.coverImage.width, height: legacyDesign.coverImage.height, bytes: 4000,
    tags: ["atelier-site", "explore-designs"],
    context: { custom: {} },
  });

  globalThis.fetch = async (input, init) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl);
    const method = (init?.method || "GET").toUpperCase();
    if (url.hostname === "res.cloudinary.com" && method === "HEAD") {
      return cloudAssets.has(deliveryId(url)) ? new Response(null, { status: 200, headers: { "content-type": "image/webp" } }) : new Response(null, { status: 404 });
    }
    if (url.hostname !== "api.cloudinary.com" || !url.pathname.startsWith("/v1_1/atelier-test-cloud/")) throw new Error(`Unexpected test network request: ${url.hostname}${url.pathname}`);
    if (url.pathname.endsWith("/resources/image/upload") && method === "GET") return Response.json({ resources: [...cloudAssets.values()] });
    if (url.pathname.includes("/resources/image/upload/") && method === "GET") {
      const asset = cloudAssets.get(resourceId(url));
      return asset ? Response.json(asset) : Response.json({ error: "not found" }, { status: 404 });
    }
    if (url.pathname.endsWith("/image/upload") && method === "POST") {
      if (failNextCloudinaryUpload) {
        failNextCloudinaryUpload = false;
        return Response.json({ error: "temporary test failure" }, { status: 503 });
      }
      const form = init?.body as FormData;
      const publicId = String(form.get("public_id"));
      if (cloudAssets.has(publicId)) return Response.json({ error: "already exists" }, { status: 409 });
      const file = form.get("file") as File;
      const optimizedData = Buffer.from(await file.arrayBuffer());
      const optimizedMetadata = await sharp(optimizedData).metadata();
      assert.equal(file.type, "image/webp");
      const asset = {
        public_id: publicId,
        secure_url: `https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/${publicId}.webp`,
        format: optimizedMetadata.format || "", width: optimizedMetadata.width || 0, height: optimizedMetadata.height || 0, bytes: file.size, tags: String(form.get("tags") || "").split(",").filter(Boolean),
        context: { custom: makeContext(String(form.get("context") || "")) },
      };
      cloudAssets.set(publicId, asset);
      return Response.json(asset);
    }
    if (url.pathname.includes("/resources/image/upload/") && method === "POST") {
      const id = resourceId(url);
      const asset = cloudAssets.get(id);
      if (!asset) return Response.json({ error: "not found" }, { status: 404 });
      const params = getBodyParams(init?.body);
      asset.context = { custom: makeContext(params.get("context") || "") };
      asset.tags = (params.get("tags") || "").split(",").filter(Boolean);
      if (failAfterCloudinaryContextUpdate) {
        failAfterCloudinaryContextUpdate = false;
        return Response.json({ error: "temporary test failure after update" }, { status: 503 });
      }
      return Response.json(asset);
    }
    if (url.pathname.endsWith("/image/rename") && method === "POST") {
      const params = getBodyParams(init?.body);
      const from = params.get("from_public_id") || "";
      const to = params.get("to_public_id") || "";
      const overwrite = params.get("overwrite") === "true";
      const asset = cloudAssets.get(from);
      if (!asset || (cloudAssets.has(to) && !overwrite)) return Response.json({ error: "rename failed" }, { status: 409 });
      cloudAssets.delete(from);
      const renamed = { ...asset, public_id: to, secure_url: `https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/${to}.webp` };
      cloudAssets.set(to, renamed);
      return Response.json(renamed);
    }
    if (url.pathname.endsWith("/image/destroy") && method === "POST") {
      const id = getBodyParams(init?.body).get("public_id") || "";
      cloudAssets.delete(id);
      return Response.json({ result: "ok" });
    }
    throw new Error(`Unexpected test Cloudinary request: ${method} ${url.pathname}`);
  };

  const png = await sharp({ create: { width: 12, height: 8, channels: 3, background: { r: 90, g: 140, b: 170 } } }).png().toBuffer();
  const makeImageRequest = (key: string, fields: Record<string, string>, name = "wall.png", bytes = png) => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), name);
    for (const [field, value] of Object.entries(fields)) form.append(field, value);
    return new Request("http://localhost/api/admin/upload", { method: "POST", headers: { cookie, Origin: "http://localhost", "Idempotency-Key": key }, body: form });
  };
  try {
    const homepageBannerKey = adminMediaKey("atelier-wall-story/home/homepage-banner");
    const protectedBanner = await getAdminMedia(new Request("http://localhost/api/admin/media?section=home", { headers: { cookie } }));
    const protectedBannerAsset = (await protectedBanner.json()).assets.find((asset: { secureUrl: string }) => asset.secureUrl.endsWith("/atelier-wall-story/home/homepage-banner.webp"));
    assert.equal(protectedBannerAsset?.active, true);
    assert.equal(protectedBannerAsset?.canToggle, false);
    assert.equal(protectedBannerAsset?.canDelete, false);
    assert.equal((await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: homepageBannerKey, active: false }, "PATCH", cookie, { Origin: "http://localhost" }))).status, 409);
    assert.equal((await deleteAdminMedia(new Request(`http://localhost/api/admin/media?key=${encodeURIComponent(homepageBannerKey)}`, { method: "DELETE", headers: { cookie, Origin: "http://localhost" } }))).status, 409);

    const categoryUpload = await uploadAdminImage(makeImageRequest("design-upload-key-0001", { placement: "design", categorySlug: "food-and-lifestyle" }));
    assert.equal(categoryUpload.status, 200);
    const categoryBody = await categoryUpload.json();
    assert.equal(categoryBody.ok, true);
    const categoryAsset = [...cloudAssets.values()].find((asset) => asset.context?.custom?.upload_request_id === "design-upload-key-0001");
    assert.ok(categoryAsset);
    assert.equal(categoryAsset.context?.custom?.category_slug, "food-and-lifestyle");
    assert.equal(categoryAsset.context?.custom?.subcategory_slug, "");
    assert.equal(categoryAsset.format, "webp");
    assert.equal(categoryAsset.width, 12);
    assert.equal(categoryAsset.height, 8);
    const staticCategoryOrder = DEVELOPMENT_FIXTURE_DESIGNS.filter((design) => design.categorySlug === "food-and-lifestyle").reduce((highest, design) => Math.max(highest, design.sortOrder), 0);
    assert.equal(Number(categoryAsset.context?.custom?.display_order), staticCategoryOrder + 1);

    const categoryAssetKey = adminMediaKey(categoryAsset.public_id);
    const originalCategoryPlacement = {
      placement: categoryAsset.context?.custom?.placement,
      category: categoryAsset.context?.custom?.category_slug,
      subcategory: categoryAsset.context?.custom?.subcategory_slug,
      order: categoryAsset.context?.custom?.display_order,
    };
    failAfterCloudinaryContextUpdate = true;
    const visibilityFailure = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: categoryAssetKey, active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(visibilityFailure.status, 503);
    assert.equal((await visibilityFailure.json()).error, "Unable to update image visibility. Please try again.");
    assert.equal(categoryAsset.context?.custom?.active, "true", "a failed toggle restores the saved active state");

    const hideCategoryImage = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: categoryAssetKey, active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(hideCategoryImage.status, 200);
    assert.equal(categoryAsset.context?.custom?.active, "false");
    assert.deepEqual({ placement: categoryAsset.context?.custom?.placement, category: categoryAsset.context?.custom?.category_slug, subcategory: categoryAsset.context?.custom?.subcategory_slug, order: categoryAsset.context?.custom?.display_order }, originalCategoryPlacement);
    const inactiveCategoryList = await getAdminMedia(new Request("http://localhost/api/admin/media?section=explore-designs&category=food-and-lifestyle&status=inactive", { headers: { cookie } }));
    const inactiveCategoryBody = await inactiveCategoryList.json();
    assert.ok(inactiveCategoryBody.assets.some((asset: { secureUrl: string }) => asset.secureUrl.endsWith(`${categoryAsset.public_id}.webp`)));
    assert.equal(inactiveCategoryBody.counts.inactive, 1);
    assert.equal(inactiveCategoryBody.counts.active + inactiveCategoryBody.counts.inactive, inactiveCategoryBody.counts.all);
    const publicWhileInactive = await (await getManagedSiteImages()).json();
    assert.equal(publicWhileInactive.images.find((image: { publicId: string }) => image.publicId === categoryAsset.public_id)?.active, false);
    assert.equal(mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, publicWhileInactive.images).some((design) => design.coverImage.publicId === categoryAsset.public_id), false);
    const activeCategoryList = await getAdminMedia(new Request("http://localhost/api/admin/media?section=explore-designs&category=food-and-lifestyle&status=active", { headers: { cookie } }));
    assert.equal((await activeCategoryList.json()).assets.some((asset: { secureUrl: string }) => asset.secureUrl.endsWith(`${categoryAsset.public_id}.webp`)), false);

    const reactivateCategoryImage = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: categoryAssetKey, active: true }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(reactivateCategoryImage.status, 200);
    const publicAfterReactivation = await (await getManagedSiteImages()).json();
    const restoredCategoryDesign = mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, publicAfterReactivation.images).find((design) => design.coverImage.publicId === categoryAsset.public_id);
    assert.ok(restoredCategoryDesign);
    assert.equal(restoredCategoryDesign.sortOrder, Number(originalCategoryPlacement.order));
    assert.equal(restoredCategoryDesign.categorySlug, originalCategoryPlacement.category);
    assert.equal(categoryAsset.context?.custom?.subcategory_slug, originalCategoryPlacement.subcategory);

    const legacyDesignKey = adminMediaKey(legacyDesignId);
    const legacyHide = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: legacyDesignKey, active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(legacyHide.status, 200, "legacy category images without saved placement fields remain manageable");
    assert.equal(cloudAssets.get(legacyDesignId)?.context?.custom?.active, "false");
    const publicWithoutLegacy = await (await getManagedSiteImages()).json();
    assert.equal(publicWithoutLegacy.images.some((image: { publicId: string; active: boolean }) => image.publicId === legacyDesignId && image.active), false);
    assert.equal(mergeManagedDesignImages(DEVELOPMENT_FIXTURE_DESIGNS, publicWithoutLegacy.images).some((design) => design.coverImage.publicId === legacyDesignId), false);
    const legacyReactivate = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: legacyDesignKey, active: true }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(legacyReactivate.status, 200);
    const publicWithLegacy = await (await getManagedSiteImages()).json();
    assert.ok(publicWithLegacy.images.some((image: { publicId: string; active: boolean }) => image.publicId === legacyDesignId && image.active));

    const duplicate = await uploadAdminImage(makeImageRequest("design-upload-key-0001", { placement: "design", categorySlug: "food-and-lifestyle" }));
    assert.equal((await duplicate.json()).duplicate, true);
    assert.equal([...cloudAssets.values()].filter((asset) => asset.context?.custom?.upload_request_id === "design-upload-key-0001").length, 1);
    const differentPng = await sharp({ create: { width: 12, height: 8, channels: 3, background: { r: 180, g: 40, b: 90 } } }).png().toBuffer();
    const changedRetry = await uploadAdminImage(makeImageRequest("design-upload-key-0001", { placement: "design", categorySlug: "food-and-lifestyle" }, "different.png", differentPng));
    assert.equal(changedRetry.status, 409);

    const pendingKey = "pending-upload-key-01";
    const pendingFingerprint = createHash("sha256").update(png).update(JSON.stringify({ placement: "design", categorySlug: "food-and-lifestyle", subcategorySlug: "", altText: "Wall art for Food and lifestyle" })).digest("hex");
    const pendingId = "atelier-wall-story/designs/food-and-lifestyle/unassigned/AE02-90";
    cloudAssets.set(pendingId, {
      public_id: pendingId,
      secure_url: `https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/${pendingId}.webp`,
      format: "webp", width: 12, height: 8, bytes: 1000, tags: ["atelier-site", "explore-designs", "catalogue", "food-and-lifestyle"],
      context: { custom: { alt: "Wall art for Food and lifestyle", placement: "design", page: "explore-designs", section: "catalogue", category_slug: "food-and-lifestyle", category_name: "Food and lifestyle", category_code: "CAT-02", artwork_code: "AE02-90", subcategory_slug: "", subcategory_name: "", display_order: "90", active: "true", upload_request_id: pendingKey, upload_request_fingerprint: pendingFingerprint, upload_request_status: "pending" } },
    });
    const countBeforePendingRetry = cloudAssets.size;
    const pendingPublicResponse = await getManagedSiteImages();
    const pendingPublicBody = await pendingPublicResponse.json();
    assert.equal(pendingPublicBody.images.some((image: { publicId: string }) => image.publicId === pendingId), false);
    const pendingRetry = await uploadAdminImage(makeImageRequest(pendingKey, { placement: "design", categorySlug: "food-and-lifestyle" }));
    assert.equal(pendingRetry.status, 200);
    assert.equal((await pendingRetry.json()).duplicate, true);
    assert.equal(cloudAssets.size, countBeforePendingRetry);
    assert.equal(cloudAssets.get(pendingId)?.context?.custom?.upload_request_status, "complete");

    const subcategoryUpload = await uploadAdminImage(makeImageRequest("design-upload-key-0002", { placement: "design", categorySlug: "food-and-lifestyle", subcategorySlug: "design-1" }, "subcat.png"));
    assert.equal(subcategoryUpload.status, 200);
    const subcategoryAsset = [...cloudAssets.values()].find((asset) => asset.context?.custom?.upload_request_id === "design-upload-key-0002");
    assert.equal(subcategoryAsset?.context?.custom?.subcategory_slug, "design-1");

    failNextCloudinaryUpload = true;
    const failure = await uploadAdminImage(makeImageRequest("design-upload-key-0003", { placement: "design", categorySlug: "food-and-lifestyle" }, "retry.png"));
    assert.equal(failure.status, 503);
    const retry = await uploadAdminImage(makeImageRequest("design-upload-key-0003", { placement: "design", categorySlug: "food-and-lifestyle" }, "retry.png"));
    assert.equal(retry.status, 200);
    assert.equal([...cloudAssets.values()].filter((asset) => asset.context?.custom?.upload_request_id === "design-upload-key-0003").length, 1);

    const project = DEVELOPMENT_PROJECT_FIXTURES[0];
    const projectUpload = await uploadAdminImage(makeImageRequest("project-upload-key-0001", { placement: "project-gallery", projectSlug: project.slug }, "project.png"));
    assert.equal(projectUpload.status, 200);
    const projectAsset = [...cloudAssets.values()].find((asset) => asset.context?.custom?.upload_request_id === "project-upload-key-0001");
    assert.ok(projectAsset);
    const siteImagesResponse = await getManagedSiteImages();
    assert.equal(siteImagesResponse.status, 200);
    const siteImages = await siteImagesResponse.json();
    assert.ok(siteImages.images.some((image: { categorySlug: string; placement: string }) => image.categorySlug === "food-and-lifestyle" && image.placement === "design"));
    const uploadedPublicIds = new Set([categoryAsset!.public_id, subcategoryAsset!.public_id, projectAsset!.public_id]);
    const newlyUploadedPublicImages = siteImages.images.filter((image: { publicId: string }) => uploadedPublicIds.has(image.publicId));
    assert.equal(newlyUploadedPublicImages.length, uploadedPublicIds.size, "every image from the multi-image upload flow reaches the public catalogue");
    assert.ok(newlyUploadedPublicImages.every((image: { active: boolean }) => image.active), "new uploads are active on the website by default");
    const mergedProject = mergeManagedProjectImages([project], siteImages.images)[0];
    assert.equal(mergedProject.galleryMedia.length, project.galleryMedia.length + 1);
    assert.ok(mergedProject.galleryMedia.some((image) => image.publicId.includes("projects/managed/")));

    const subcategoryAssetKey = adminMediaKey(subcategoryAsset!.public_id);
    const projectAssetKey = adminMediaKey(projectAsset.public_id);
    failAfterCloudinaryContextUpdate = true;
    const bulkFailure = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility-bulk", assetKeys: [subcategoryAssetKey, projectAssetKey], active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(bulkFailure.status, 503);
    assert.equal(subcategoryAsset?.context?.custom?.active, "true", "a failed bulk toggle restores every attempted image");
    assert.equal(projectAsset.context?.custom?.active, "true");
    const bulkInactive = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility-bulk", assetKeys: [subcategoryAssetKey, projectAssetKey], active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(bulkInactive.status, 200);
    assert.equal((await bulkInactive.json()).updated, 2);
    assert.equal(subcategoryAsset?.context?.custom?.active, "false");
    assert.equal(projectAsset.context?.custom?.active, "false");
    const hiddenProject = mergeManagedProjectImages([project], (await (await getManagedSiteImages()).json()).images)[0];
    assert.equal(hiddenProject.galleryMedia.length, project.galleryMedia.length);
    const bulkActive = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility-bulk", assetKeys: [subcategoryAssetKey, projectAssetKey], active: true }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(bulkActive.status, 200);
    assert.equal(subcategoryAsset?.context?.custom?.active, "true");
    assert.equal(projectAsset.context?.custom?.active, "true");
    const duplicateBulkKeys = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility-bulk", assetKeys: [projectAssetKey, projectAssetKey], active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(duplicateBulkKeys.status, 400);

    const unassignedKey = adminMediaKey("atelier-wall-story/admin-library/loose-image");
    const assigned = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "assign", assetKey: unassignedKey, categorySlug: "food-and-lifestyle", subcategorySlug: "design-1" }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(assigned.status, 200);
    assert.equal(cloudAssets.get("atelier-wall-story/admin-library/loose-image")?.context?.custom?.placement, "design");
    const categoryListing = await getAdminMedia(new Request("http://localhost/api/admin/media?section=explore-designs&category=food-and-lifestyle", { headers: { cookie } }));
    const listingBody = await categoryListing.json();
    assert.equal(listingBody.taxonomy.categories.find((item: { slug: string }) => item.slug === "food-and-lifestyle").imageCount, 5);
    assert.equal(listingBody.taxonomy.categories.find((item: { slug: string }) => item.slug === "food-and-lifestyle").subcategories.find((item: { slug: string }) => item.slug === "design-1").imageCount, 2);

    const fixedKey = adminMediaKey("atelier-wall-story/projects/walls-lotus-residence-cover");
    const fixedReplacement = await uploadAdminImage(makeImageRequest("fixed-replace-key-0001", { replaceId: fixedKey }, "replacement.png"));
    assert.equal(fixedReplacement.status, 200);
    const fixedAsset = cloudAssets.get("atelier-wall-story/projects/walls-lotus-residence-cover");
    assert.equal(fixedAsset?.context?.custom?.upload_request_id, "fixed-replace-key-0001");
    assert.ok(fixedAsset);
    assert.equal([...cloudAssets.keys()].some((id) => id.includes("replacements/previous-")), false);
    const fixedVisibility = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility", assetKey: fixedKey, active: false }, "PATCH", cookie, { Origin: "http://localhost" }));
    assert.equal(fixedVisibility.status, 409);
    assert.equal(fixedAsset.context?.custom?.active, "true");

    const deleteKey = adminMediaKey(categoryAsset!.public_id);
    const deleted = await deleteAdminMedia(new Request(`http://localhost/api/admin/media?key=${encodeURIComponent(deleteKey)}`, { method: "DELETE", headers: { cookie, Origin: "http://localhost" } }));
    assert.equal(deleted.status, 200);
    assert.equal(cloudAssets.has(categoryAsset!.public_id), false);

    const bulkDeleteIds = ["atelier-wall-story/admin-library/bulk-delete-one", "atelier-wall-story/admin-library/bulk-delete-two"];
    for (const publicId of bulkDeleteIds) {
      cloudAssets.set(publicId, {
        public_id: publicId,
        secure_url: `https://res.cloudinary.com/atelier-test-cloud/image/upload/f_auto,q_auto/${publicId}.webp`,
        format: "webp", width: 1200, height: 800, bytes: 4000, tags: ["atelier-site", "admin-library"],
        context: { custom: { alt: "Unused image", page: "admin-library", section: "uploads", placement: "library", active: "false" } },
      });
    }
    const bulkDeleteKeys = bulkDeleteIds.map(adminMediaKey);
    const protectedBulkDeleteParams = new URLSearchParams();
    protectedBulkDeleteParams.append("key", bulkDeleteKeys[0]);
    protectedBulkDeleteParams.append("key", homepageBannerKey);
    const protectedBulkDelete = await deleteAdminMedia(new Request(`http://localhost/api/admin/media?${protectedBulkDeleteParams.toString()}`, { method: "DELETE", headers: { cookie, Origin: "http://localhost" } }));
    assert.equal(protectedBulkDelete.status, 409);
    assert.equal(cloudAssets.has(bulkDeleteIds[0]), true, "a protected selection leaves every selected image untouched");

    const bulkDeleteParams = new URLSearchParams();
    bulkDeleteKeys.forEach((key) => bulkDeleteParams.append("key", key));
    const bulkDeleted = await deleteAdminMedia(new Request(`http://localhost/api/admin/media?${bulkDeleteParams.toString()}`, { method: "DELETE", headers: { cookie, Origin: "http://localhost" } }));
    assert.equal(bulkDeleted.status, 200);
    assert.equal((await bulkDeleted.json()).deleted, 2);
    assert.equal(cloudAssets.has(bulkDeleteIds[0]), false);
    assert.equal(cloudAssets.has(bulkDeleteIds[1]), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("bulk image visibility changes also require administrator authentication", async () => {
  const response = await patchAdminMedia(jsonRequest("http://localhost/api/admin/media", { action: "visibility-bulk", assetKeys: ["not-a-real-key"], active: false }, "PATCH"));
  assert.equal(response.status, 401);
});

test("Resend retries preserve content/idempotency and acceptance is never marked delivered", async () => {
  process.env.RESEND_API_KEY = "test-api-key"; process.env.RESEND_FROM_EMAIL = "studio@example.test"; process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.test";
  const now = new Date().toISOString();
  const record: StoredEnquiryRecord = { id: "notification-test", referenceCode: "TEST", fullName: "Email Customer", email: "mail@example.test", phone: "", interestType: "general", serviceOrDesignInterest: "Wall", message: "Test email body", status: "New", adminNotes: [], sourcePage: "/contact", emailNotificationSent: false, emailStatus: "pending", emailAttempts: 0, createdAt: now, updatedAt: now };
  await saveEnquiryRecord(record);
  const bodies: string[] = []; const keys: string[] = [];
  globalThis.fetch = async (_url, options) => { bodies.push(String(options?.body)); keys.push(new Headers(options?.headers).get("Idempotency-Key") || ""); return bodies.length === 1 ? new Response("{}", { status: 503 }) : Response.json({ id: "provider-123" }); };
  await sendEnquiryNotification(record.id);
  const db = await getDb(); let stored = await db.collection("enquiries").findOne({ id: record.id }); assert.equal(stored?.emailStatus, "failed");
  await sendEnquiryNotification(record.id);
  stored = await db.collection("enquiries").findOne({ id: record.id }); assert.equal(stored?.emailStatus, "sent"); assert.equal(stored?.emailProviderId, "provider-123");
  assert.equal(bodies[0], bodies[1]); assert.equal(keys[0], keys[1]);
  await sendEnquiryNotification(record.id); assert.equal(bodies.length, 2);
  await retryPendingEnquiryEmails(1);
  globalThis.fetch = realFetch;
});
test("public enquiry sends only the owner email with the selected artwork codes", async () => {
  const environmentKeys = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_RECEIVER_EMAIL", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "ADMIN_NOTIFICATION_EMAIL", "ENQUIRY_NOTIFICATION_TO_EMAIL", "APP_URL", "NEXT_PUBLIC_SITE_URL"] as const;
  const previousEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
  for (const key of ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_RECEIVER_EMAIL", "ENQUIRY_NOTIFICATION_TO_EMAIL", "NEXT_PUBLIC_SITE_URL"]) delete process.env[key];
  process.env.RESEND_API_KEY = "test-api-key";
  process.env.RESEND_FROM_EMAIL = "studio@example.test";
  process.env.ADMIN_NOTIFICATION_EMAIL = "owner@example.test";
  process.env.APP_URL = "https://atelier-psi-lovat.vercel.app";
  const submittedArtwork = DEVELOPMENT_FIXTURE_DESIGNS.find(item => item.artworkCode && !["AE02-01", "AE05-11", "AE06-07"].includes(item.artworkCode));
  assert.ok(submittedArtwork);
  const requests: Array<{ subject: string; to: string[]; reply_to: string; html?: string; text: string }> = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const parsed = JSON.parse(String(init?.body));
    requests.push(parsed);
    return Response.json({ id: "workflow-owner-1" });
  };
  try {
    const payload = {
      fullName: "Sumit & Co",
      email: "customer@example.test",
      phone: "+919876543210",
      serviceInterest: "Walls",
      serviceOrDesignInterest: "3D Printing on Walls",
      selectedDesignSlug: submittedArtwork.slug,
      selectedDesignReference: submittedArtwork.title,
      message: "Please print <feature wall> & hide the <script> tag.",
      sourcePage: "/contact",
    };
    const response = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", payload));
    assert.equal(response.status, 201);
    const responseBody = await response.json();
    assert.equal(responseBody.ok, true);
    assert.equal(requests.length, 1);

    const ownerEmail = requests[0];
    assert.deepEqual(ownerEmail.to, ["owner@example.test"]);
    assert.equal(ownerEmail.subject, "New Enquiry – Sumit & Co | ATELIER Wall Story");
    assert.equal(ownerEmail.reply_to, payload.email);
    assert.match(ownerEmail.html || "", /New Enquiry Received/);
    assert.match(ownerEmail.html || "", /Category Code/);
    assert.match(ownerEmail.html || "", new RegExp(submittedArtwork.categoryCode));
    assert.match(ownerEmail.html || "", new RegExp(submittedArtwork.artworkCode!));
    assert.match(ownerEmail.text, new RegExp(submittedArtwork.categoryCode));
    assert.match(ownerEmail.text, new RegExp(submittedArtwork.artworkCode!));
    assert.doesNotMatch(ownerEmail.html || "", /Catalogue Category &amp; Image Code Reference/);
    assert.doesNotMatch(ownerEmail.text, /Catalogue Category and Image Code Reference|CAT-\d{2} —/);
    assert.doesNotMatch(ownerEmail.html || "", /AE02-01|AE05-11|AE06-07|Hidden\/retired from the public catalogue/);
    assert.match(ownerEmail.html || "", /Call Customer/);
    assert.match(ownerEmail.html || "", /WhatsApp Customer/);
    assert.match(ownerEmail.html || "", /Reply via Email/);
    assert.match(ownerEmail.html || "", /href="tel:\+919876543210"/);
    assert.match(ownerEmail.html || "", /href="https:\/\/wa\.me\/919876543210\?text=Hello%20Sumit%20%26%20Co/);
    assert.match(ownerEmail.html || "", /href="mailto:customer@example\.test"/);
    assert.match(ownerEmail.html || "", /@media only screen and \(max-width:600px\)/);
    assert.match(ownerEmail.html || "", /Sumit &amp; Co/);
    assert.match(ownerEmail.html || "", /&lt;feature wall&gt; &amp; hide the &lt;script&gt; tag\./);
    assert.doesNotMatch(ownerEmail.html || "", /\/admin\/enquiries|View Enquiry in Admin Panel|vercel\.app\/admin/);
    assert.match(ownerEmail.text, /Enquiry Date and Time: .* IST/);
    assert.match(ownerEmail.text, /Website – Contact Form/);
    assert.doesNotMatch(ownerEmail.text, /\.vercel\.app/i);
    assert.doesNotMatch(ownerEmail.html || "", /\.vercel\.app/i);
    assert.doesNotMatch(ownerEmail.html || "", /Project Location|Property Type|Wall Dimensions|Reference Images/);
    assert.equal(requests.some(request => request.to.includes(payload.email)), false);

    const stored = await (await getDb()).collection("enquiries").findOne({ referenceCode: responseBody.referenceCode });
    assert.equal(stored?.emailStatus, "sent", stored?.emailLastError || "owner email did not reach sent state");
    assert.equal(stored?.emailProviderId, "workflow-owner-1");
    assert.equal(stored?.customerEmailStatus, undefined);
    assert.equal(stored?.customerEmailAttempts, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of environmentKeys) {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    }
  }
});

test("password changes are persistent, verify the current password, and revoke existing sessions", async () => {
  const cookie = await adminCookie();
  const sessionRequest = new Request("http://localhost/api/admin/auth", { headers: { cookie } });
  const wrongCurrent = await changeAdminPassword(jsonRequest("http://localhost/api/admin/auth", {
    currentPassword: "not-the-current-password",
    newPassword: "atelier-secure-password-2040!",
    confirmPassword: "atelier-secure-password-2040!",
  }, "PATCH", cookie));
  assert.equal(wrongCurrent.status, 400);
  assert.equal((await getActiveAdminSession(sessionRequest))?.email, "admin@example.test");

  const newPassword = "atelier-secure-password-2040!";
  const changed = await changeAdminPassword(jsonRequest("http://localhost/api/admin/auth", {
    currentPassword: "correct-test-password",
    newPassword,
    confirmPassword: newPassword,
  }, "PATCH", cookie));
  assert.equal(changed.status, 200);
  assert.match(changed.headers.get("set-cookie") || "", /Max-Age=0/);
  assert.equal(await getActiveAdminSession(sessionRequest), null);

  const shared = globalThis as typeof globalThis & { atelierMongo?: Promise<{ close(): Promise<void> }> };
  if (shared.atelierMongo) await (await shared.atelierMongo).close();
  delete shared.atelierMongo;

  const credential = await (await getDb()).collection<{ _id: string; passwordHash?: string }>("admin_credentials").findOne({ _id: "primary" });
  assert.match(String(credential?.passwordHash), /^scrypt:/);
  assert.notEqual(credential?.passwordHash, newPassword);
  assert.equal(await getActiveAdminSession(sessionRequest), null);
  assert.equal((await verifyAdminLoginCredentials("admin@example.test", "correct-test-password")).ok, false);
  assert.equal((await verifyAdminLoginCredentials("admin@example.test", newPassword)).ok, true);

  const signedIn = await adminLogin(jsonRequest("http://localhost/api/admin/auth", { email: "admin@example.test", password: newPassword }));
  assert.equal(signedIn.status, 200);
  const nextCookie = (signedIn.headers.get("set-cookie") || "").split(";")[0];
  const nextSession = await getActiveAdminSession(new Request("http://localhost/api/admin/auth", { headers: { cookie: nextCookie } }));
  assert.equal(nextSession?.email, "admin@example.test");
});
test("delivery webhook rejects invalid signature and verifies real delivery state", async () => {
  const raw = JSON.stringify({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: "provider-123" } });
  const secret = randomBytes(32); process.env.RESEND_WEBHOOK_SECRET = `whsec_${secret.toString("base64")}`;
  assert.equal((await emailWebhook(new Request("http://localhost/api/webhooks/resend", { method: "POST", body: raw }))).status, 401);
  const timestamp = String(Math.floor(Date.now() / 1000)); const id = "event-123";
  const signature = createHmac("sha256", secret).update(`${id}.${timestamp}.${raw}`).digest("base64");
  const request = () => new Request("http://localhost/api/webhooks/resend", { method: "POST", headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` }, body: raw });
  assert.equal((await emailWebhook(request())).status, 200); assert.equal((await emailWebhook(request())).status, 200);
  assert.equal((await (await getDb()).collection("enquiries").findOne({ id: "notification-test" }))?.emailStatus, "delivered");
});
