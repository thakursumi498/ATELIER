"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { adminButtonClass, adminCardClass, adminInputClass, adminLabelClass } from "@/components/admin/AdminUiPrimitives";

interface AccountProfile {
  accountName: string;
  email: string;
  accountType: string;
  notificationEmail: string | null;
}

export function AdminAccountSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/account", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error("Account details could not be loaded. Please refresh the page.");
        if (active) setProfile(data.profile);
      })
      .catch(() => { if (active) setError("Account details could not be loaded. Please refresh the page."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setNotice("");
    if (newPassword.length < 12) {
      setPasswordError("Choose a password with at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to update your password. Please try again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your password has been updated successfully. Taking you to sign in…");
      window.setTimeout(() => {
        router.replace("/admin/login?passwordUpdated=1");
        router.refresh();
      }, 1200);
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : "Unable to update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B1C1C]">Your account</p>
        <h2 className="mt-1 font-serif text-3xl font-normal sm:text-[34px]">Account Settings</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#746B64]">Manage your account details and keep your sign-in secure.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-[#9B1C1C]/30 bg-[#FFFDF9] p-4 text-sm text-[#9B1C1C]">{error}</p> : null}

      <section id="profile" className={`${adminCardClass} scroll-mt-24 p-5 sm:p-6`}>
        <div className="flex items-center gap-3 border-b border-[#E8DED3] pb-4"><div className="rounded-full bg-[#9B1C1C]/10 p-2 text-[#9B1C1C]"><ShieldCheck className="h-4 w-4" /></div><div><h3 className="font-serif text-xl">My Profile</h3><p className="mt-0.5 text-xs text-[#746B64]">Your administrator account details.</p></div></div>
        {loading ? <p className="py-5 text-sm text-[#746B64]">Loading account details…</p> : profile ? (
          <dl className="grid gap-4 pt-5 sm:grid-cols-3">
            <div><dt className={adminLabelClass}>Account name</dt><dd className="text-sm font-medium text-[#1A1A1A]">{profile.accountName}</dd></div>
            <div><dt className={adminLabelClass}>Registered email</dt><dd className="break-all text-sm font-medium text-[#1A1A1A]">{profile.email}</dd></div>
            <div><dt className={adminLabelClass}>Account type</dt><dd className="text-sm font-medium text-[#1A1A1A]">{profile.accountType}</dd></div>
          </dl>
        ) : null}
      </section>

      <section className={`${adminCardClass} p-5 sm:p-6`}>
        <div className="flex items-center gap-3 border-b border-[#E8DED3] pb-4"><div className="rounded-full bg-[#9B1C1C]/10 p-2 text-[#9B1C1C]"><Mail className="h-4 w-4" /></div><div><h3 className="font-serif text-xl">Email Notifications</h3><p className="mt-0.5 text-xs text-[#746B64]">New customer enquiries are sent to this address.</p></div></div>
        <p className="pt-4 text-sm font-medium text-[#1A1A1A]">{loading ? "Loading…" : profile?.notificationEmail || "Notification address is not available."}</p>
      </section>

      <section id="password" className={`${adminCardClass} scroll-mt-24 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E8DED3] pb-4">
          <div className="flex items-center gap-3"><div className="rounded-full bg-[#9B1C1C]/10 p-2 text-[#9B1C1C]"><KeyRound className="h-4 w-4" /></div><div><h3 className="font-serif text-xl">Change Password</h3><p className="mt-0.5 text-xs text-[#746B64]">Use at least 12 characters. You’ll sign in again after the update.</p></div></div>
          <button type="button" onClick={() => setShowPasswords((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#746B64] hover:bg-[#FAF6F0] hover:text-[#1A1A1A]">
            {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
        </div>
        <form onSubmit={updatePassword} className="max-w-2xl space-y-4 pt-5">
          <label className={adminLabelClass}>Current Password<input autoComplete="current-password" required type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={`${adminInputClass} mt-1.5`} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={adminLabelClass}>New Password<input autoComplete="new-password" required minLength={12} type={showPasswords ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={`${adminInputClass} mt-1.5`} /></label>
            <label className={adminLabelClass}>Confirm New Password<input autoComplete="new-password" required minLength={12} type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${adminInputClass} mt-1.5`} /></label>
          </div>
          {passwordError ? <p role="alert" className="text-sm text-[#9B1C1C]">{passwordError}</p> : null}
          {notice ? <p role="status" className="text-sm text-[#264E32]">{notice}</p> : null}
          <button type="submit" disabled={saving} className={adminButtonClass("primary", "sm")}>{saving ? "Updating…" : "Update Password"}</button>
        </form>
      </section>

      <section id="security" className={`${adminCardClass} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}>
        <div><h3 className="font-serif text-xl">Account Security</h3><p className="mt-1 text-xs text-[#746B64]">Sign out when you’ve finished managing the website.</p></div>
        <button type="button" onClick={signOut} className={adminButtonClass("secondary", "sm")}><LogOut className="h-3.5 w-3.5" />Sign Out</button>
      </section>
    </div>
  );
}
