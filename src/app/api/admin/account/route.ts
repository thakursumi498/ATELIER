import { requireAdminRequest } from "@/lib/admin-auth";
import { getEnquiryNotificationAddress } from "@/lib/enquiry-email";
import { privateJson } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const notificationEmail = await getEnquiryNotificationAddress().catch(() => null);
    return privateJson({
      ok: true,
      profile: {
        accountName: "Studio Administrator",
        email: auth.session.email,
        accountType: "Administrator",
        notificationEmail,
      },
    });
  } catch {
    return privateJson({ ok: false, error: "Account details could not be loaded. Please refresh the page." }, 503);
  }
}
