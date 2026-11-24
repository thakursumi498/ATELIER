import type { StoredEnquiryRecord } from "@/lib/enquiries-store";
import type { CatalogueDesignItem } from "@/lib/designs-catalogue";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface EnquiryEmailBrandContext {
  websiteUrl?: string | null;
  logoUrl?: string | null;
}

type EnquiryEmailRecord = StoredEnquiryRecord & {
  projectLocation?: string | null;
  propertyType?: string | null;
  wallDimensions?: string | null;
  referenceImages?: Array<string | {
    url?: string | null;
    secureUrl?: string | null;
    filename?: string | null;
    altText?: string | null;
  }> | null;
};

interface DetailRow {
  label: string;
  value: string;
  link?: string;
}

function cleanValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!cleaned || /^(?:null|undefined|n\/?a|not provided|not supplied|none|unknown|-)$/i.test(cleaned)) return undefined;
  return cleaned;
}

function cleanHumanReference(value: unknown): string | undefined {
  const cleaned = cleanValue(value);
  if (!cleaned) return undefined;
  // Public email copy should show human references such as AE01-01, never raw
  // Mongo ObjectIds or UUIDs supplied in legacy enquiry records.
  if (/^(?:[a-f\d]{24}|[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12})$/i.test(cleaned)) return undefined;
  return cleaned;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.hostname.toLowerCase().endsWith(".vercel.app")
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function formatDateTimeIst(value: string): string | undefined {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeParts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = timeParts.find(part => part.type === "hour")?.value;
  const minute = timeParts.find(part => part.type === "minute")?.value;
  const period = timeParts.find(part => part.type === "dayPeriod")?.value.toUpperCase();
  if (!hour || !minute || !period) return undefined;
  return `${dateLabel} | ${hour}:${minute} ${period} IST`;
}

function humanSource(value: string): string {
  const source = value.split(/[?#]/, 1)[0].replace(/\/$/, "").toLowerCase();
  if (source === "/admin" || source.startsWith("/admin/") || source === "/api" || source.startsWith("/api/")) {
    return "Website – Enquiry Form";
  }
  const known: Record<string, string> = {
    "/contact": "Website – Contact Form",
    "/visualizer": "Website – Wall Visualizer",
    "/explore-designs": "Website – Design Collection",
    "/projects": "Website – Projects",
    "/services": "Website – Services",
  };
  if (known[source]) return known[source];
  if (!source || source === "/") return "Website – Enquiry Form";
  const lastSegment = source.split("/").filter(Boolean).at(-1);
  if (!lastSegment) return "Website – Enquiry Form";
  let decoded = lastSegment;
  try { decoded = decodeURIComponent(lastSegment); } catch { /* Keep malformed slugs readable as-is. */ }
  const readable = decoded
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
  return `Website – ${readable}`;
}

function formatPhone(value: string | null | undefined): { tel: string; whatsapp: string } | undefined {
  const raw = cleanValue(value);
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  if (digits.length < 7 || digits.length > 15) return undefined;
  return { tel: `+${digits}`, whatsapp: digits };
}

function htmlBreaks(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function detailRows(rows: DetailRow[]): string {
  return rows.map(row => `<tr>
    <td class="detail-label" style="width:34%;padding:12px 14px;border-bottom:1px solid #eee8df;color:#71675e;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;vertical-align:top;">${escapeHtml(row.label)}</td>
    <td class="detail-value" style="padding:12px 14px;border-bottom:1px solid #eee8df;color:#211f1d;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;vertical-align:top;">${row.link ? `<a href="${escapeHtmlAttribute(row.link)}" style="color:#211f1d;text-decoration:underline;">${htmlBreaks(row.value)}</a>` : htmlBreaks(row.value)}</td>
  </tr>`).join("");
}

function referenceImageDetails(record: EnquiryEmailRecord): { rows: DetailRow[] } {
  if (!Array.isArray(record.referenceImages)) return { rows: [] };
  const links = record.referenceImages.flatMap((image, index) => {
    const url = safeHttpUrl(typeof image === "string" ? image : image.url || image.secureUrl);
    if (!url) return [];
    const filename = typeof image === "string" ? undefined : cleanValue(image.filename || image.altText);
    return [{ label: `Reference image ${index + 1}`, value: filename || `Open reference image ${index + 1}`, link: url }];
  });
  return { rows: links };
}

function designRows(record: EnquiryEmailRecord, artwork?: CatalogueDesignItem | null): DetailRow[] {
  const rows: DetailRow[] = [];
  if (artwork) {
    const categoryCode = cleanValue(artwork.categoryCode) || `CAT-${String(artwork.categorySlotNumber).padStart(2, "0")}`;
    const categoryLabel = cleanValue(artwork.categoryLabel);
    const subcategory = cleanValue(artwork.subCategoryLabel);
    const artworkCode = cleanValue(artwork.artworkCode);
    if (categoryLabel) rows.push({ label: "Design Category", value: categoryLabel });
    if (categoryCode) rows.push({ label: "Category Code", value: categoryCode });
    if (subcategory) rows.push({ label: "Subcategory", value: subcategory });
    if (artworkCode) rows.push({ label: "Image Unique Code", value: artworkCode });
    const title = cleanHumanReference(artwork.title);
    if (title) rows.push({ label: "Selected Design", value: title });
  }
  const designReference = cleanHumanReference(record.selectedDesignReference);
  if (designReference) rows.push({ label: "Design / Project Reference", value: designReference });
  return rows;
}

function ownerRows(record: EnquiryEmailRecord, artwork?: CatalogueDesignItem | null): DetailRow[] {
  const rows: DetailRow[] = [];
  const add = (label: string, value: unknown) => {
    const clean = cleanValue(value);
    if (clean) rows.push({ label, value: clean });
  };
  add("Enquiry Reference Number", record.referenceCode);
  add("Customer Name", record.fullName);
  add("Email Address", record.email);
  add("Phone Number", record.phone);
  add("Service Interested In", record.serviceOrDesignInterest);
  add("Project Location", record.projectLocation);
  add("Property Type", record.propertyType);
  add("Wall Dimensions", record.wallDimensions);
  rows.push(...designRows(record, artwork));
  add("Enquiry Source", humanSource(record.sourcePage));
  add("Enquiry Date and Time", formatDateTimeIst(record.createdAt));
  add("Customer Message / Requirements", record.message);
  rows.push(...referenceImageDetails(record).rows);
  return rows;
}

function emailShell(input: {
  logoUrl?: string | null;
  title: string;
  subheading: string;
  content: string;
  websiteUrl?: string;
  footerMessage?: string;
}): string {
  const safeLogoUrl = safeHttpUrl(input.logoUrl);
  const safeWebsiteUrl = safeHttpUrl(input.websiteUrl);
  const logo = safeLogoUrl
    ? `<img src="${escapeHtmlAttribute(safeLogoUrl)}" width="210" alt="ATELIER Wall Story" style="display:block;width:210px;max-width:100%;height:auto;border:0;">`
    : `<span style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:21px;letter-spacing:5px;">ATELIER</span>`;
  const siteLink = safeWebsiteUrl
    ? `<a href="${escapeHtmlAttribute(safeWebsiteUrl)}" style="color:#e8e2d9;text-decoration:underline;">Visit ATELIER Wall Story</a>`
    : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(input.title)}</title>
<style>
  @media only screen and (max-width:600px) {
    .email-shell{width:100%!important;}
    .email-gutter{padding-left:16px!important;padding-right:16px!important;}
    .email-card{padding:20px!important;}
    .detail-label,.detail-value{display:block!important;width:auto!important;padding:8px 12px!important;}
    .action-cell{display:block!important;width:auto!important;padding:5px 0!important;}
    .action-link{display:block!important;text-align:center!important;}
  }
</style></head>
<body style="margin:0;padding:0;background-color:#f3efe8;color:#211f1d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f3efe8;">
    <tr><td class="email-gutter" align="center" style="padding:32px 16px;">
      <table class="email-shell" role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;border-collapse:separate;border-spacing:0;">
        <tr><td style="padding:22px 28px;background-color:#211f1d;border-radius:16px 16px 0 0;">${logo}</td></tr>
        <tr><td class="email-card" style="padding:30px 34px 34px;background-color:#fffdf9;border:1px solid #e5d9ca;border-top:0;">
          <p style="margin:0 0 8px;color:#9b1c1c;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">ATELIER WALL STORY</p>
          <h1 style="margin:0;color:#211f1d;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:normal;line-height:1.2;">${escapeHtml(input.title)}</h1>
          <p style="margin:12px 0 24px;color:#71675e;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;">${escapeHtml(input.subheading)}</p>
          ${input.content}
        </td></tr>
        <tr><td style="padding:18px 24px;background-color:#211f1d;border-radius:0 0 16px 16px;color:#e8e2d9;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;text-align:center;">
          <strong style="color:#ffffff;">ATELIER Wall Story</strong><br>
          ${escapeHtml(input.footerMessage || "This is an automated notification generated when a customer submits an enquiry through the ATELIER Wall Story website.")}<br>
          © ${new Date().getFullYear()} ATELIER Wall Story. All rights reserved.${siteLink ? `<br>${siteLink}` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function actionButton(label: string, href: string): string {
  return `<td class="action-cell" align="center" style="width:33.33%;padding:4px;">
    <a class="action-link" href="${escapeHtmlAttribute(href)}" style="display:inline-block;padding:12px 14px;border:1px solid #d8c7b5;border-radius:4px;background-color:#f7f3ec;color:#211f1d;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>
  </td>`;
}

export function buildOwnerEnquiryEmail(
  record: StoredEnquiryRecord,
  context: EnquiryEmailBrandContext,
  artwork?: CatalogueDesignItem | null,
): EmailContent {
  const details = record as EnquiryEmailRecord;
  const name = cleanValue(record.fullName) || "Customer";
  const subjectName = name.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").slice(0, 120);
  const subject = `New Enquiry – ${subjectName} | ATELIER Wall Story`;
  const rows = ownerRows(details, artwork);
  const phone = formatPhone(record.phone);
  const actions = [
    ...(phone ? [actionButton("Call Customer", `tel:${phone.tel}`)] : []),
    ...(phone ? [actionButton("WhatsApp Customer", `https://wa.me/${phone.whatsapp}?text=${encodeURIComponent(`Hello ${name}, thank you for contacting ATELIER Wall Story regarding enquiry ${record.referenceCode}.`)}`)] : []),
    actionButton("Reply via Email", `mailto:${record.email}`),
  ];
  const text = [
    "New Enquiry Received",
    "A potential customer has expressed interest in your services.",
    "",
    ...rows.map(row => `${row.label}: ${row.value}${row.link ? ` — ${row.link}` : ""}`),
    "",
    "ATELIER Wall Story",
    "This is an automated notification generated when a customer submits an enquiry through the ATELIER Wall Story website.",
    `© ${new Date().getFullYear()} ATELIER Wall Story. All rights reserved.`,
    ...(context.websiteUrl ? [context.websiteUrl] : []),
  ].filter(Boolean).join("\n");
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #eee8df;">${detailRows(rows)}</table>
    <h2 style="margin:26px 0 10px;color:#211f1d;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;">Contact this customer</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>${actions.join("")}</tr></table>`;
  return {
    subject,
    text,
    html: emailShell({
      logoUrl: context.logoUrl,
      title: "New Enquiry Received",
      subheading: "A potential customer has expressed interest in your services.",
      content,
      websiteUrl: context.websiteUrl || undefined,
    }),
  };
}

