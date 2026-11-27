import type { Metadata } from "next";
import { AdminAccountSettings } from "@/components/admin/AdminAccountSettings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account Settings" };

export default function AdminSettingsPage() {
  return <AdminAccountSettings />;
}
