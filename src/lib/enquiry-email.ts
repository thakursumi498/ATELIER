import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/mongodb";
import type { StoredEnquiryRecord } from "@/lib/enquiries-store";
import { ATELIER_BRAND } from "@/lib/brand";
import type { SiteSettingsDocument } from "@/types/models";
import {
  assignArtworkReferenceCodes,
  DEVELOPMENT_FIXTURE_DESIGNS,
  findDesignBySlugOrId,
  type CatalogueDesignItem,
} from "@/lib/designs-catalogue";
import { buildOwnerEnquiryEmail, type EmailContent, type EnquiryEmailBrandContext } from "@/lib/enquiry-email-templates";

type EmailPayload = { from: string; to: string[]; reply_to: string; subject: string; text: string; html?: string };
type EmailProvider = "brevo" | "resend";
type SiteSettingsEnvelope = { published?: SiteSettingsDocument | null } | null;
type NotificationRecord = StoredEnquiryRecord & {
  emailRequest?: EmailPayload;
  emailFirstAttemptAt?: string;
  emailProvider?: EmailProvider;
};

const OWNER_DELIVERY_FIELDS = {
  status: "emailStatus",
  providerId: "emailProviderId",
  leaseUntil: "emailLeaseUntil",
  attempts: "emailAttempts",
  retryAt: "emailRetryAt",
  lastError: "emailLastError",
  request: "emailRequest",
  provider: "emailProvider",
  idempotencyKey: "emailIdempotencyKey",
  firstAttemptAt: "emailFirstAttemptAt",
} as const;

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isVercelUrl(value: string): boolean {
  try {
    return new URL(value).hostname.toLowerCase().endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function configuredSiteUrls(): { siteUrl?: string; websiteUrl?: string } {
  const candidates = [process.env.APP_URL, process.env.NEXT_PUBLIC_SITE_URL];
  const validCandidates: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if ((url.protocol === "https:" || url.protocol === "http:") && !["localhost", "127.0.0.1"].includes(url.hostname)) {
        validCandidates.push(url.origin);
      }
    } catch {
      // Ignore malformed environment values and try the next configured URL.
    }
  }
  // Use a configured custom domain when one exists. Deployment hosts are not
  // included in customer or owner emails, including image URLs.
  const siteUrl = validCandidates.find(candidate => !isVercelUrl(candidate));
  return siteUrl ? { siteUrl, websiteUrl: `${siteUrl}/` } : {};
}

function absoluteAssetUrl(value: string | null | undefined, siteUrl?: string, fallbackPath = ATELIER_BRAND.assets.logoWhite): string | undefined {
  const candidate = value?.trim() || fallbackPath;
  try {
    const url = candidate.startsWith("/") && !candidate.startsWith("//")
      ? siteUrl ? new URL(candidate, siteUrl) : undefined
      : new URL(candidate);
    if (url && (url.protocol === "https:" || url.protocol === "http:") && !isVercelUrl(url.toString())) return url.toString();
  } catch {
    // Ignore malformed image URLs and fall back to the text wordmark.
  }
  return undefined;
}

function emailContext(settings: SiteSettingsEnvelope, urls: ReturnType<typeof configuredSiteUrls>): EnquiryEmailBrandContext {
  return {
    websiteUrl: urls.websiteUrl,
    logoUrl: absoluteAssetUrl(
      settings?.published?.logoDark?.secureUrl,
      urls.siteUrl,
      ATELIER_BRAND.assets.logoWhite,
    ),
  };
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

function getDeliveryConfig(settings: SiteSettingsEnvelope) {
  const preferences = settings?.published?.enquiryNotifications;
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const brevoSender = process.env.BREVO_SENDER_EMAIL?.trim();
  const brevoReceiver = process.env.BREVO_RECEIVER_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendSender = process.env.RESEND_FROM_EMAIL?.trim();
  const brevoOwnerRecipient = brevoReceiver || preferences?.destinationEmail?.trim();
  const useBrevo = Boolean(brevoKey && brevoSender && brevoOwnerRecipient) || !resendKey;
  const provider: EmailProvider = useBrevo ? "brevo" : "resend";
  const key = useBrevo ? brevoKey : resendKey;
  const from = useBrevo ? brevoSender : resendSender;
  const to = preferences?.destinationEmail?.trim() || (useBrevo ? brevoReceiver : process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.ENQUIRY_NOTIFICATION_TO_EMAIL?.trim());
  const disabled = preferences?.enabled === false;
  return { provider, key, from, to, disabled };
}

async function sendEnquiryEmail(id: string): Promise<void> {
  const db = await getDb();
  const records = db.collection<NotificationRecord>("enquiries");
  const fields = OWNER_DELIVERY_FIELDS;
  const now = new Date();
  const nowIso = now.toISOString();
  const record = await records.findOneAndUpdate(
    {
      id,
      [fields.status]: { $in: ["pending", "failed"] },
      [fields.providerId]: { $in: [null] },
      $or: [
        { [fields.leaseUntil]: { $exists: false } },
        { [fields.leaseUntil]: null },
        { [fields.leaseUntil]: { $lt: nowIso } },
      ],
      [fields.attempts]: { $lt: 5 },
    },
    { $set: { [fields.leaseUntil]: new Date(now.getTime() + 60000).toISOString() } },
    { returnDocument: "after" },
  );
  if (!record) return;

  const attemptsBeforeSend = Number(record[fields.attempts as keyof NotificationRecord] || 0);
  try {
    const settings = await db.collection<{ published?: SiteSettingsDocument | null }>("site_settings").findOne({ id: "site-settings-global" }) as SiteSettingsEnvelope;
    const config = getDeliveryConfig(settings);
    if (
      config.disabled || !config.key || !config.from || !config.to ||
      !validEmail(config.from) || !validEmail(config.to)
    ) {
      await records.updateOne(
        { id },
        { $set: {
          [fields.status]: "failed",
          [fields.lastError]: config.disabled ? "Notifications are disabled in site settings." : "Email notification service is not configured.",
          [fields.leaseUntil]: null,
          [fields.retryAt]: new Date(now.getTime() + 60 * 60000).toISOString(),
        } },
      );
      return;
    }

    const previousProvider = record[fields.provider as keyof NotificationRecord] as EmailProvider | undefined;
    const sameProvider = previousProvider === config.provider;
    const retryWindowMs = config.provider === "brevo" ? 14 * 60 * 1000 : 23 * 60 * 60000;
    const previousFirstAttempt = sameProvider
      ? record[fields.firstAttemptAt as keyof NotificationRecord] as string | undefined
      : undefined;
    if (previousFirstAttempt && now.getTime() - Date.parse(previousFirstAttempt) > retryWindowMs) {
      await records.updateOne(
        { id },
        { $set: {
          [fields.status]: "failed",
          [fields.attempts]: 5,
          [fields.lastError]: "Automatic retry window expired. Check provider delivery before resending.",
          [fields.leaseUntil]: null,
          [fields.retryAt]: null,
        } },
      );
      return;
    }

    const existingIdempotencyKey = record[fields.idempotencyKey as keyof NotificationRecord] as string | undefined;
    const idempotencyKey = config.provider === "brevo"
      ? (sameProvider && isUuid(existingIdempotencyKey) ? existingIdempotencyKey : randomUUID())
      : (sameProvider && existingIdempotencyKey ? existingIdempotencyKey : `enquiry/${record.id}`);
    const urls = configuredSiteUrls();
    const context = emailContext(settings, urls);
    const selectedArtwork = record.selectedDesignSlug
      ? await findSelectedArtwork(db, record.selectedDesignSlug)
      : null;
    const emailContent: EmailContent = buildOwnerEnquiryEmail(record, context, selectedArtwork);
    const savedPayload = record[fields.request as keyof NotificationRecord] as EmailPayload | undefined;
    const savedBody = `${savedPayload?.text || ""}\n${savedPayload?.html || ""}`;
    const containsRemovedAdminLink = /\/admin\/enquiries|View Enquiry in Admin Panel/i.test(savedBody);
    const containsRemovedCatalogue = /Catalogue Category(?: &amp;| and) Image Code Reference|CATALOGUE CATEGORY AND IMAGE CODE REFERENCE/i.test(savedBody);
    const reusablePayload = savedPayload && attemptsBeforeSend > 0 && !containsRemovedAdminLink && !containsRemovedCatalogue
      ? savedPayload
      : undefined;
    const replyTo = validEmail(record.email) ? record.email : config.from;
    const payload: EmailPayload = {
      ...(reusablePayload || emailContent),
      from: config.from,
      to: [config.to],
      reply_to: replyTo,
    };
    const firstAttemptAt = previousFirstAttempt || nowIso;
    await records.updateOne(
      { id },
      {
        $set: {
          [fields.request]: payload,
          [fields.provider]: config.provider,
          [fields.idempotencyKey]: idempotencyKey,
          [fields.firstAttemptAt]: firstAttemptAt,
          emailAttemptedAt: nowIso,
        },
        $inc: { [fields.attempts]: 1 },
      },
    );

    const requestBody = config.provider === "brevo"
      ? {
          sender: { name: "ATELIER Wall Story", email: payload.from },
          to: payload.to.map(email => ({ email })),
          replyTo: { email: payload.reply_to },
          subject: payload.subject,
          textContent: payload.text,
          ...(payload.html ? { htmlContent: payload.html } : {}),
          headers: { IdempotencyKey: idempotencyKey },
        }
      : {
          from: payload.from,
          to: payload.to,
          reply_to: payload.reply_to,
          subject: payload.subject,
          text: payload.text,
          ...(payload.html ? { html: payload.html } : {}),
        };
    const response = await fetch(config.provider === "brevo" ? "https://api.brevo.com/v3/smtp/email" : "https://api.resend.com/emails", {
      method: "POST",
      headers: config.provider === "brevo"
        ? { "api-key": config.key, "Content-Type": "application/json", Accept: "application/json" }
        : { Authorization: "Bearer " + config.key, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null) as { id?: string; messageId?: string; code?: string } | null;
    const duplicateBrevoRequest = config.provider === "brevo" && data?.code === "duplicate_parameter";
    const providerId = config.provider === "brevo" ? data?.messageId : data?.id;
    if ((!response.ok && !duplicateBrevoRequest) || (response.ok && !providerId)) {
      throw new Error("Email provider returned HTTP " + response.status + ".");
    }
    await records.updateOne(
      { id, [fields.status]: { $ne: "delivered" } },
      { $set: {
        [fields.status]: "sent",
        [fields.providerId]: providerId || null,
        emailSent: true,
        emailNotificationSent: true,
        [fields.lastError]: null,
        [fields.leaseUntil]: null,
        [fields.retryAt]: null,
      } },
    );
  } catch (error) {
    const attempts = attemptsBeforeSend + 1;
    const message = error instanceof Error && /^Email provider returned HTTP \d+\.$/.test(error.message)
      ? error.message
      : "Notification could not be confirmed. A safe retry is queued.";
    await records.updateOne(
      { id, [fields.status]: { $ne: "delivered" } },
      { $set: {
        [fields.status]: "failed",
        [fields.lastError]: message,
        [fields.leaseUntil]: null,
        [fields.retryAt]: attempts < 5 ? new Date(Date.now() + Math.pow(4, attempts) * 60000).toISOString() : null,
      } },
    );
  }
}

/** Provider acceptance is recorded as sent; Resend webhooks may later mark it delivered. */
export async function sendEnquiryNotification(id: string): Promise<void> {
  return sendEnquiryEmail(id);
}

function pendingDeliveryFilter(now: string) {
  const fields = OWNER_DELIVERY_FIELDS;
  return {
    [fields.status]: { $in: ["pending", "failed"] as const },
    [fields.attempts]: { $lt: 5 },
    $or: [{ [fields.retryAt]: null }, { [fields.retryAt]: { $lte: now } }],
  };
}

export async function retryPendingEnquiryEmails(limit = 20) {
  const db = await getDb();
  const now = new Date().toISOString();
  const records = await db.collection<NotificationRecord>("enquiries").find(
    pendingDeliveryFilter(now),
    { projection: { id: 1 } },
  ).sort({ createdAt: 1 }).limit(Math.max(1, Math.min(limit, 100))).toArray();
  for (const record of records) {
    await sendEnquiryNotification(record.id);
  }
  return { processed: records.length };
}
