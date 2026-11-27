"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { adminButtonClass } from "@/components/admin/AdminUiPrimitives";
import {
  ExternalLink,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "Overview",
    links: [{ href: "/admin", label: "Dashboard", Icon: LayoutDashboard }],
  },
  {
    title: "Website Management",
    links: [{ href: "/admin/images", label: "Manage Images", Icon: Images }],
  },
  {
    title: "Customer Management",
    links: [{ href: "/admin/enquiries", label: "Customer Enquiries", Icon: MessageSquare }],
  },
  {
    title: "Account",
    links: [{ href: "/admin/settings", label: "Account Settings", Icon: Settings }],
  },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/images": "Manage Images",
  "/admin/enquiries": "Customer Enquiries",
  "/admin/settings": "Account Settings",
};

export function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const isLoginRoute = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const [openedForPath, setOpenedForPath] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const mobileNavOpen = openedForPath === pathname;

  const refreshChromeState = useCallback(() => {
    if (isLoginRoute) return;
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSessionEmail(data?.authenticated ? data?.session?.email ?? null : null))
      .catch(() => setSessionEmail(null));
  }, [isLoginRoute]);

  useEffect(() => refreshChromeState(), [refreshChromeState]);

  useEffect(() => {
    if (!mobileNavOpen && !accountMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenedForPath(null);
        setAccountMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, accountMenuOpen]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => undefined);
    setSessionEmail(null);
    setAccountMenuOpen(false);
    router.push("/admin/login");
    router.refresh();
  };

  if (isLoginRoute) {
    return (
      <div className="atelier-admin-theme min-h-screen bg-[#FAF6F0] text-[#1A1A1A] selection:bg-[#9B1C1C] selection:text-[#FFFDF9]">
        {children}
      </div>
    );
  }

  const renderNavigation = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#E8DED3] px-5 py-5">
        <Link href="/admin" onClick={onNavigate} className="inline-flex flex-col gap-1 focus:outline-none">
          <BrandLogo variant="primary" size="md" priority />
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#746B64]">Studio</span>
        </Link>
        {onNavigate ? (
          <button type="button" onClick={onNavigate} aria-label="Close navigation menu" className="rounded-xl border border-[#DFD0C0] p-2 text-[#746B64] hover:text-[#1A1A1A] lg:hidden">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Studio navigation" className="flex-1 space-y-5 overflow-y-auto px-3.5 py-5">
        {NAV_GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="mb-2 px-3 font-sans text-[10px] font-semibold uppercase tracking-[0.17em] text-[#746B64]">{group.title}</h2>
            <div className="space-y-1">
              {group.links.map(({ href, label, Icon }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-[13px] transition-colors ${active ? "bg-[#9B1C1C]/[0.08] font-semibold text-[#9B1C1C]" : "font-medium text-[#574F49] hover:bg-[#FAF6F0] hover:text-[#1A1A1A]"}`}
                  >
                    {active ? <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#9B1C1C]" /> : null}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#9B1C1C]" : "text-[#746B64] group-hover:text-[#1A1A1A]"}`} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="space-y-3 border-t border-[#E8DED3] bg-[#FAF6F0]/60 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#9B1C1C]/20 bg-[#9B1C1C]/10 font-serif text-base uppercase text-[#9B1C1C]">A</div>
          <div className="min-w-0">
            <p className="truncate font-sans text-xs font-medium text-[#1A1A1A]">Studio Administrator</p>
            <p className="truncate font-sans text-[11px] text-[#746B64]">{sessionEmail || "Administrator account"}</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#DFD0C0] bg-[#FFFDF9] px-3 py-2 font-sans text-xs font-medium text-[#1A1A1A] transition-colors hover:border-[#9B1C1C]/40">
            <ExternalLink className="h-3.5 w-3.5 text-[#746B64]" />View Website
          </Link>
          {sessionEmail ? (
            <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#DFD0C0] bg-[#FFFDF9] px-3 py-2 font-sans text-xs font-medium text-[#746B64] transition-colors hover:border-[#9B1C1C]/40 hover:text-[#9B1C1C]">
              <LogOut className="h-3.5 w-3.5" /><span>Sign Out</span>
            </button>
          ) : (
            <Link href={`/admin/login?next=${encodeURIComponent(pathname)}`} aria-label="Sign in" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#9B1C1C] px-3 text-[#FFFDF9] hover:bg-[#801619]"><KeyRound className="h-4 w-4" /></Link>
          )}
        </div>
      </div>
    </div>
  );

  const title = PAGE_TITLES[pathname] || "Studio";

  return (
    <div className="atelier-admin-theme flex min-h-screen bg-[#FAF6F0] text-[#1A1A1A]">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-[#DFD0C0] bg-[#FFFDF9] lg:block">
        {renderNavigation()}
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close navigation" className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-[2px]" onClick={() => setOpenedForPath(null)} />
          <aside className="relative z-10 h-full w-[290px] max-w-[86vw] border-r border-[#DFD0C0] bg-[#FFFDF9] shadow-[0_24px_60px_rgba(26,26,26,0.22)]">
            {renderNavigation(() => setOpenedForPath(null))}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 h-[68px] border-b border-[#E8DED3] bg-[#FFFDF9]/95 backdrop-blur-md">
          <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setOpenedForPath(pathname)} aria-label="Open navigation menu" className="rounded-xl border border-[#DFD0C0] bg-[#FFFDF9] p-2 text-[#1A1A1A] hover:bg-[#FAF6F0] lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="truncate font-serif text-lg font-medium sm:text-xl">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#DFD0C0] bg-[#FFFDF9] px-3 sm:px-3.5 font-sans text-xs font-medium text-[#1A1A1A] transition-colors hover:border-[#9B1C1C]/40">
                <ExternalLink className="h-3.5 w-3.5 text-[#746B64]" /><span>View Website</span>
              </Link>
              <div className="relative">
                <button type="button" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DFD0C0] bg-[#FFFDF9] px-3 font-sans text-xs font-medium text-[#574F49] hover:border-[#9B1C1C]/40">
                  <UserRound className="h-4 w-4 text-[#9B1C1C]" /><span className="hidden sm:inline">Account</span>
                </button>
                {accountMenuOpen ? (
                  <div role="menu" className="absolute right-0 top-12 z-40 w-52 rounded-xl border border-[#DFD0C0] bg-[#FFFDF9] p-1.5 shadow-[0_12px_36px_rgba(26,26,26,0.14)]">
                    <Link role="menuitem" href="/admin/settings#profile" onClick={() => setAccountMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-[#574F49] hover:bg-[#FAF6F0]">My Account</Link>
                    <Link role="menuitem" href="/admin/settings#password" onClick={() => setAccountMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-[#574F49] hover:bg-[#FAF6F0]">Change Password</Link>
                    <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#9B1C1C] hover:bg-[#FAF6F0]"><LogOut className="h-3.5 w-3.5" />Sign Out</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminAuthBanner({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  if (authenticated) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#9B1C1C]/30 bg-[#FFFDF9] p-4 shadow-[0_4px_16px_rgba(32,28,26,0.03)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9B1C1C]/10 text-[#9B1C1C]"><ShieldAlert className="h-4 w-4" /></div>
        <div><p className="font-sans text-sm font-medium text-[#1A1A1A]">Administrator sign-in required</p><p className="font-sans text-xs text-[#746B64]">Sign in to manage website images and customer enquiries.</p></div>
      </div>
      <Link href={`/admin/login?next=${encodeURIComponent(pathname || "/admin")}`} className={adminButtonClass("primary", "sm")}><KeyRound className="h-3.5 w-3.5" />Sign In</Link>
    </div>
  );
}
