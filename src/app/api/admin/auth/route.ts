import { z } from "zod";
import { buildClearSessionCookieHeader, buildSessionCookieHeader, getActiveAdminSession, persistAdminPassword, persistAdminSession, revokeAdminSession, signAdminSessionToken, verifyAdminLoginCredentials } from "@/lib/admin-auth";
import { checkSameOrigin, enforceRateLimit, privateJson, readJsonBody, requestErrorResponse } from "@/lib/request-security";
import { requireAdminRequest } from "@/lib/admin-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const session = await getActiveAdminSession(request);
    return privateJson({ ok: true, authenticated: Boolean(session), session: session ? { email: session.email, role: session.role } : null });
  } catch (error) { return requestErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(1024) }).safeParse(await readJsonBody(request, 4096));
    if (!parsed.success) return privateJson({ ok: false, error: "Please enter a valid email and password." }, 400);
    await enforceRateLimit(request, "admin-login", 10, 15 * 60 * 1000);
    const verified = await verifyAdminLoginCredentials(parsed.data.email, parsed.data.password);
    if (!verified.ok) return privateJson({ ok: false, error: verified.error }, 401);
    const token = signAdminSessionToken(verified.email);
    await persistAdminSession(token, verified.sessionVersion);
    const response = privateJson({ ok: true, authenticated: true, session: { email: verified.email, role: "super_admin" } });
    response.headers.set("Set-Cookie", buildSessionCookieHeader(token));
    return response;
  } catch (error) { return requestErrorResponse(error, "Unable to sign in. Please try again."); }
}
export async function DELETE(request: Request) {
  try {
    checkSameOrigin(request);
    await revokeAdminSession(request);
    const response = privateJson({ ok: true, authenticated: false });
    response.headers.set("Set-Cookie", buildClearSessionCookieHeader());
    return response;
  } catch (error) { return requestErrorResponse(error); }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(12).max(1024),
  confirmPassword: z.string().min(1).max(1024),
}).strict();

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "password1234", "qwerty123", "123456789012",
  "letmein123", "admin123456", "welcome123", "iloveyou123", "changeme123", "atelier123",
]);

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    await enforceRateLimit(request, "admin-password-change", 5, 15 * 60 * 1000);
    const parsed = passwordSchema.safeParse(await readJsonBody(request, 4096));
    if (!parsed.success) return privateJson({ ok: false, error: "Enter your current password and a new password with at least 12 characters." }, 400);
    const { currentPassword, newPassword, confirmPassword } = parsed.data;
    if (newPassword !== confirmPassword) return privateJson({ ok: false, error: "The new passwords do not match." }, 400);
    if (COMMON_PASSWORDS.has(newPassword.trim().toLowerCase())) return privateJson({ ok: false, error: "Choose a less common password." }, 400);
    const current = await verifyAdminLoginCredentials(auth.session.email, currentPassword);
    if (!current.ok) return privateJson({ ok: false, error: "Your current password is incorrect." }, 400);
    const reused = await verifyAdminLoginCredentials(auth.session.email, newPassword);
    if (reused.ok) return privateJson({ ok: false, error: "Choose a password you have not used before." }, 400);
    await persistAdminPassword(auth.session.email, newPassword);
    const response = privateJson({ ok: true, message: "Your password has been updated successfully." });
    response.headers.set("Set-Cookie", buildClearSessionCookieHeader());
    return response;
  } catch (error) {
    return requestErrorResponse(error, "Unable to update your password. Please try again.");
  }
}
