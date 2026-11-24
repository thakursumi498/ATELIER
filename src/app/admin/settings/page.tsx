import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, Settings } from "lucide-react";
import { getEnvironmentReadiness } from "@/lib/env";

const cardClass = "rounded-[20px] border border-[#DFD0C0] bg-[#FFFDF9] shadow-[0_6px_24px_rgba(32,28,26,0.04)]";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  const status = getEnvironmentReadiness();
  const items = [
    { label: "Image storage", detail: "Website images are stored and optimized in Cloudinary.", ready: status.cloudinaryConfigured },
    { label: "Enquiry storage", detail: "Customer enquiries are stored in MongoDB Atlas.", ready: status.mongodbConfigured },
    { label: "Owner email notifications", detail: "New enquiries notify the studio owner only.", ready: status.emailConfigured },
    { label: "Administrator sign-in", detail: "Protected image and enquiry tools require an admin session.", ready: status.adminAuthConfigured },
  ];

  return <div className="space-y-6">
    <header><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B1C1C]">ATELIER Studio</p><h1 className="mt-1 font-serif text-3xl sm:text-4xl">Settings</h1><p className="mt-2 max-w-2xl text-sm text-[#746B64]">Read-only status for the services used by the website. Categories and website copy stay in the shared frontend configuration.</p></header>
    <section className={`${cardClass} divide-y divide-[#E8DED3]`}>
      {items.map((item) => {
        const Icon = item.ready ? CheckCircle2 : CircleAlert;
        return <div key={item.label} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div className="flex items-start gap-3"><div className={`rounded-full p-2 ${item.ready ? "bg-[#EAF4EC] text-[#315B3B]" : "bg-[#FFF2E8] text-[#9B541C]"}`}><Icon className="h-4 w-4"/></div><div><h2 className="text-sm font-semibold">{item.label}</h2><p className="mt-1 text-xs leading-relaxed text-[#746B64]">{item.detail}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${item.ready ? "bg-[#EAF4EC] text-[#315B3B]" : "bg-[#FFF2E8] text-[#9B541C]"}`}>{item.ready ? "Connected" : "Needs setup"}</span></div>;
      })}
    </section>
    <section className={`${cardClass} p-5 sm:p-6`}><div className="flex items-start gap-3"><Settings className="mt-0.5 h-4 w-4 text-[#9B1C1C]"/><div><h2 className="text-sm font-semibold">Image handling</h2><p className="mt-1 text-xs leading-relaxed text-[#746B64]">New uploads are limited to 5 MB and converted to optimized WebP before storage. Replacing a used image keeps its website placement and updates its existing Cloudinary asset.</p></div></div></section>
  </div>;
}
