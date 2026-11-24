import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { scryptSync, randomBytes, createHmac } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getDb } from "../src/lib/mongodb";
import { buildSessionCookieHeader, getActiveAdminSession, persistAdminSession, requireAdminRequest, revokeAdminSession, signAdminSessionToken, verifyAdminCredentials, verifyAdminSessionToken } from "../src/lib/admin-auth";
import { checkSameOrigin, RequestError, readJsonBody } from "../src/lib/request-security";
import { GET as listEnquiries, PATCH as patchEnquiry, csvCell } from "../src/app/api/admin/enquiries/route";
import { POST as submitEnquiry } from "../src/app/api/enquiries/route";
import { POST as emailWebhook } from "../src/app/api/webhooks/resend/route";
import { saveEnquiryRecord, type StoredEnquiryRecord } from "../src/lib/enquiries-store";
import { sendEnquiryNotification, retryPendingEnquiryEmails } from "../src/lib/enquiry-email";
import { DEVELOPMENT_FIXTURE_DESIGNS } from "../src/lib/designs-catalogue";
let mongo: MongoMemoryServer;
const realFetch = globalThis.fetch;
before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri(); process.env.MONGODB_DB_NAME = "security_tests";
  process.env.ADMIN_AUTH_SECRET = "test-secret-at-least-32-characters-long";
  process.env.INITIAL_ADMIN_EMAIL = "admin@example.test";
  process.env.INITIAL_ADMIN_PASSWORD = "correct-test-password";
});
after(async () => {
  globalThis.fetch = realFetch;
  const shared = globalThis as typeof globalThis & { atelierMongo?: Promise<{ close(): Promise<void> }> };
  if (shared.atelierMongo) await (await shared.atelierMongo).close();
  delete shared.atelierMongo;
  await mongo?.stop();
});
function jsonRequest(url: string, body: unknown, method = "POST", cookie?: string) {
  return new Request(url, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
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
  const response = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", payload));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true); assert.equal(body.enquirySummary, undefined); assert.equal(body.email, undefined);
  assert.equal(await (await getDb()).collection("enquiries").countDocuments({ email: payload.email }), 1);
  const again = await submitEnquiry(jsonRequest("http://localhost/api/enquiries", payload));
  assert.equal((await again.json()).deduplicated, true);
  assert.equal(await (await getDb()).collection("enquiries").countDocuments({ email: payload.email }), 1);
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
  const csv = await listEnquiries(new Request("http://localhost/api/admin/enquiries?format=csv", { headers: { cookie } }));
  assert.equal(csv.status, 200); assert.match(csv.headers.get("cache-control") || "", /no-store/); assert.match(await csv.text(), /customer@example.test/);
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
  const submittedArtwork = DEVELOPMENT_FIXTURE_DESIGNS.find(item => item.artworkCode);
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
