"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import { NAV_ITEMS } from "./nav-items";

/**
 * Mobile-first app shell. Renders:
 *   - Desktop (≥ md): fixed left sidebar + topbar + main content.
 *   - Mobile (< md): compact topbar with hamburger + slide-in drawer holding
 *     the same nav; the drawer auto-closes on route change and Escape.
 *
 * Owning drawer state at this level lets both the topbar and the sidebar
 * participate in it without prop drilling or global state.
 */
export function Shell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape + lock body scroll while drawer is open (mobile only)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex min-h-screen w-full flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden md:flex">
        <SidebarNav pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform bg-white shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <SidebarNav
          pathname={pathname}
          onNavigate={() => setOpen(false)}
          onClose={() => setOpen(false)}
          mobile
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — different content on mobile vs desktop */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 md:h-16 md:px-6">
          {/* Mobile: hamburger + brand */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 active:bg-gray-200"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold tracking-wide text-gray-900">
              STORE
            </span>
          </div>

          {/* Desktop: spacer to push right-side items to the right */}
          <div className="hidden md:block" />

          {/* Right side (both) */}
          <div className="flex items-center gap-2 md:gap-4">
            {email && (
              <span className="hidden max-w-[180px] truncate text-xs text-gray-500 sm:inline md:text-sm">
                {email}
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </header>

        {/* Main scroll area — leaves room for the bottom nav on mobile */}
        <main className="flex-1 overflow-y-auto px-3 pb-24 pt-4 md:overflow-y-auto md:px-6 md:py-6 md:pb-6">
          {children}
        </main>

        {/* Bottom nav for mobile — 5 most-used destinations */}
        <MobileBottomNav pathname={pathname} />
      </div>
    </div>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
  onClose,
  mobile = false,
}: {
  pathname: string;
  onNavigate: () => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  return (
    <nav
      className={cn(
        "flex h-full w-full flex-col border-r border-gray-200 bg-white",
        !mobile && "w-60 shrink-0"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 md:h-16 md:px-5">
        <span className="text-sm font-semibold tracking-wide text-gray-900">
          STORE MANAGEMENT
        </span>
        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                // 44px min-height touch target on mobile, still compact on desktop
                "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors md:min-h-0 md:py-2",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Bottom navigation strip (mobile only). The 5 most-frequent destinations.
const BOTTOM_NAV = ["/", "/incoming", "/outgoing", "/stock", "/reports"];

function MobileBottomNav({ pathname }: { pathname: string }) {
  const items = NAV_ITEMS.filter((n) => BOTTOM_NAV.includes(n.href)).sort(
    (a, b) => BOTTOM_NAV.indexOf(a.href) - BOTTOM_NAV.indexOf(b.href)
  );
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-tight transition-colors",
              active ? "text-blue-700" : "text-gray-500 hover:text-gray-800 active:text-gray-900"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-blue-700")} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
