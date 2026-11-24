import { timingSafeEqual, createHash } from "node:crypto";
import { retryPendingEnquiryEmails } from "@/lib/enquiry-email";
import { privateJson } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization") || "";
  const expectedHash = createHash("sha256").update(`Bearer ${secret || "missing"}`).digest();
  const actualHash = createHash("sha256").update(actual).digest();
  if (!secret || !timingSafeEqual(actualHash, expectedHash)) return privateJson({ ok: false, error: "Unauthorized." }, 401);
  try {
    const email = await retryPendingEnquiryEmails(10);
    return privateJson({ ok: true, email });
  } catch {
    return privateJson({ ok: false, error: "Pending enquiry notifications could not be retried." }, 503);
  }
}
