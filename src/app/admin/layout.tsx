import React from "react";
import type { Metadata } from "next";
import { getEnvironmentReadiness } from "@/lib/env";
import { AdminShellLayout } from "@/components/admin/AdminChromeClient";
import "@/components/admin/admin-theme.css";

export const metadata: Metadata = {
  title: {
    default: "Studio Admin | ATELIER — WALL STORY",
    template: "%s | ATELIER Studio Admin",
  },
  description:
    "ATELIER — WALL STORY admin for Cloudinary website images and customer enquiries.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const readiness = getEnvironmentReadiness();

  return (
    <AdminShellLayout
      mongodbConfigured={readiness.mongodbConfigured}
      adminAuthConfigured={readiness.adminAuthConfigured}
    >
      {children}
    </AdminShellLayout>
  );
}
