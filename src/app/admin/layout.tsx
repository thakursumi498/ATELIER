import React from "react";
import type { Metadata } from "next";
import { AdminShellLayout } from "@/components/admin/AdminChromeClient";
import "@/components/admin/admin-theme.css";

export const metadata: Metadata = {
  title: {
    default: "Studio Admin | ATELIER — WALL STORY",
    template: "%s | ATELIER Studio Admin",
  },
  description: "Manage ATELIER website images and customer enquiries.",
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
  return <AdminShellLayout>{children}</AdminShellLayout>;
}
