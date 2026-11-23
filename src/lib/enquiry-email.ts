import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/mongodb";
import type { StoredEnquiryRecord } from "@/lib/enquiries-store";
import {
  assignArtworkReferenceCodes,
  DEVELOPMENT_FIXTURE_DESIGNS,
  findDesignBySlugOrId,
  type CatalogueDesignItem,
} from "@/lib/designs-catalogue";

type EmailPayload = { from: string; to: string[]; reply_to: string; subject: string; text: string };
type EmailProvider = "brevo" | "resend";
type NotificationRecord = StoredEnquiryRecord & {
  emailRequest?: EmailPayload;
  emailFirstAttemptAt?: string;
  emailProvider?: EmailProvider;
};

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function findSelectedArtwork(db: Awaited<ReturnType<typeof getDb>>, slug: string) {
  const rows = await db.collection<{ published?: CatalogueDesignItem | null }>("designs")
    .find({ published: { $ne: null }, deletedAt: { $in: [null] } })
    .sort({ "published.categorySlotNumber": 1, "published.sortOrder": 1 })
    .limit(1000)
    .toArray();
  const publishedDesigns = rows.flatMap((row) => row.published ? [row.published] : []);
  const publishedMatch = findDesignBySlugOrId(
    slug,
    assignArtworkReferenceCodes(publishedDesigns),
  );
  return publishedMatch || findDesignBySlugOrId(slug, DEVELOPMENT_FIXTURE_DESIGNS);
}

/** Provider acceptance is recorded as sent. */
export async function sendEnquiryNotification(id: string): Promise<void> {
  const db = await getDb();
  const records = db.collection<NotificationRecord>("enquiries");
  const now = new Date();
  const record = await records.findOneAndUpdate(
    {
      id,
      emailStatus: { $in: ["pending", "failed"] },
      emailProviderId: { $in: [null] },
      $or: [
        { emailLeaseUntil: { $exists: false } },
        { emailLeaseUntil: null },
        { emailLeaseUntil: { $lt: now.toISOString() } },
      ],
      emailAttempts: { $lt: 5 },
    },
    { $set: { emailLeaseUntil: new Date(now.getTime() + 60000).toISOString() } },
    { returnDocument: "after" },
  );
  if (!record) return;

  try {
    const settings = await db.collection("site_settings").findOne({ id: "site-settings-global" });
    const preferences = settings?.published?.enquiryNotifications;
    const brevoKey = process.env.BREVO_API_KEY?.trim();
    const brevoSender = process.env.BREVO_SENDER_EMAIL?.trim();
    const brevoReceiver = process.env.BREVO_RECEIVER_EMAIL?.trim();
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const useBrevo = Boolean(brevoKey && brevoSender && (brevoReceiver || preferences?.destinationEmail)) || !resendKey;
    const provider: EmailProvider = useBrevo ? "brevo" : "resend";
    const key = useBrevo ? brevoKey : resendKey;
    const from = useBrevo ? brevoSender : process.env.RESEND_FROM_EMAIL?.trim();
    const to = preferences?.destinationEmail || (useBrevo
      ? brevoReceiver
      : process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ENQUIRY_NOTIFICATION_TO_EMAIL);

    if (
      preferences?.enabled === false || !key || !from || !to ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
    ) {
      await records.updateOne(
        { id },
        { $set: {
          emailStatus: "failed",
          emailLastError: preferences?.enabled === false ? "Notifications are disabled in site settings." : "Email notification service is not configured.",
          emailLeaseUntil: null,
          emailRetryAt: new Date(now.getTime() + 60 * 60000).toISOString(),
        } },
      );
      return;
    }

    const previousProvider = record.emailProvider || "resend";
    const sameProvider = previousProvider === provider;
    const retryWindowMs = useBrevo ? 14 * 60 * 1000 : 23 * 60 * 60000;
    const previousFirstAttempt = sameProvider ? record.emailFirstAttemptAt : undefined;
    if (previousFirstAttempt && now.getTime() - Date.parse(previousFirstAttempt) > retryWindowMs) {
      await records.updateOne(
        { id },
        { $set: {
          emailStatus: "failed",
          emailAttempts: 5,
          emailLastError: "Automatic retry window expired. Check provider delivery before resending.",
          emailLeaseUntil: null,
          emailRetryAt: null,
        } },
      );
      return;
    }

    const idempotencyKey = useBrevo
      ? (sameProvider && isUuid(record.emailIdempotencyKey) ? record.emailIdempotencyKey : randomUUID())
      : (sameProvider && record.emailIdempotencyKey ? record.emailIdempotencyKey : "enquiry/" + record.id);
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const adminUrl = new URL("/admin/enquiries?enquiry=" + encodeURIComponent(record.id), baseUrl).toString();
    const selectedArtwork = record.selectedDesignSlug
      ? await findSelectedArtwork(db, record.selectedDesignSlug)
      : null;
    const storedPayload = record.emailRequest || {
      from,
      to: [to],
      reply_to: record.email,
      subject: "New ATELIER enquiry " + record.referenceCode,
      text: [
        "Name: " + record.fullName,
        "Email: " + record.email,
        "Phone: " + (record.phone || "Not supplied"),
        "Interest: " + record.serviceOrDesignInterest,
        "Source: " + record.sourcePage,
        "Submitted: " + record.createdAt,
        "",
        ...(selectedArtwork?.artworkCode
          ? ["Selected artwork code: " + selectedArtwork.artworkCode]
          : record.selectedDesignReference ? ["Design reference: " + record.selectedDesignReference] : []),
        record.message,
        "",
        "Manage enquiry: " + adminUrl,
      ].join("\n"),
    };
    let emailText = storedPayload.text;
    const artworkLine = selectedArtwork?.artworkCode
      ? "Selected artwork code: " + selectedArtwork.artworkCode
      : null;
    if (artworkLine && !emailText.includes(artworkLine)) emailText += "\n\n" + artworkLine;
    const payload: EmailPayload = { ...storedPayload, from, to: [to], reply_to: record.email, text: emailText };
    const firstAttemptAt = previousFirstAttempt || now.toISOString();
    await records.updateOne(
      { id },
      {
        $set: {
          emailRequest: payload,
          emailProvider: provider,
          emailIdempotencyKey: idempotencyKey,
          emailFirstAttemptAt: firstAttemptAt,
          emailAttemptedAt: now.toISOString(),
        },
        $inc: { emailAttempts: 1 },
      },
    );

    const requestBody = useBrevo
      ? {
          sender: { name: "ATELIER Wall Story", email: payload.from },
          to: payload.to.map(email => ({ email })),
          replyTo: { email: payload.reply_to },
          subject: payload.subject,
          textContent: payload.text,
          headers: { IdempotencyKey: idempotencyKey },
        }
      : payload;
    const response = await fetch(useBrevo ? "https://api.brevo.com/v3/smtp/email" : "https://api.resend.com/emails", {
      method: "POST",
      headers: useBrevo
        ? { "api-key": key, "Content-Type": "application/json", Accept: "application/json" }
        : { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null) as { id?: string; messageId?: string; code?: string } | null;
    const duplicateBrevoRequest = useBrevo && data?.code === "duplicate_parameter";
    const providerId = useBrevo ? data?.messageId : data?.id;
    if ((!response.ok && !duplicateBrevoRequest) || (response.ok && !providerId)) {
      throw new Error("Email provider returned HTTP " + response.status + ".");
    }
    await records.updateOne(
      { id, emailStatus: { $ne: "delivered" } },
      { $set: {
        emailStatus: "sent",
        emailProviderId: providerId || null,
        emailSent: true,
        emailNotificationSent: true,
        emailLastError: null,
        emailLeaseUntil: null,
        emailRetryAt: null,
      } },
    );
  } catch (error) {
    const attempts = (record.emailAttempts || 0) + 1;
    // Keep provider bodies, recipients, and credentials out of error logs and public responses.
    const message = error instanceof Error && /^Email provider returned HTTP \d+\.$/.test(error.message)
      ? error.message
      : "Notification could not be confirmed. A safe retry is queued.";
    await records.updateOne(
      { id, emailStatus: { $ne: "delivered" } },
      { $set: {
        emailStatus: "failed",
        emailLastError: message,
        emailLeaseUntil: null,
        emailRetryAt: attempts < 5 ? new Date(Date.now() + Math.pow(4, attempts) * 60000).toISOString() : null,
      } },
    );
  }
}

export async function retryPendingEnquiryEmails(limit = 20) {
  const db = await getDb();
  const records = await db.collection<NotificationRecord>("enquiries").find(
    {
      emailStatus: { $in: ["pending", "failed"] },
      emailAttempts: { $lt: 5 },
      $or: [{ emailRetryAt: null }, { emailRetryAt: { $lte: new Date().toISOString() } }],
    },
    { projection: { id: 1 } },
  ).sort({ createdAt: 1 }).limit(Math.max(1, Math.min(limit, 100))).toArray();
  for (const record of records) await sendEnquiryNotification(record.id);
  return { processed: records.length };
}
