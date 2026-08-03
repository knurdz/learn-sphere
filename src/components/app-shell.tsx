"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
  email?: string;
  immersive?: boolean;
};

const desktopNav = [
  { href: "/feed", label: "Learn" },
  { href: "/dashboard", label: "Library" },
  { href: "/tutor", label: "Tutor" },
  { href: "/study", label: "Study tools" },
];

function isActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children, email, immersive = false }: AppShellProps) {
  const pathname = usePathname();
  const surface = immersive
    ? "bg-slate-950 text-white"
    : "bg-[#f6f8fc] text-slate-950";

  return (
    <div className={`min-h-screen ${surface}`}>
      <header
        className={
          immersive
            ? "fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur-xl"
            : "sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
        }
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-10">
          <Link href="/feed" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
              L
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">LearnSphere</span>
              <span
                className={`hidden text-[10px] font-semibold uppercase tracking-[0.2em] sm:block ${
                  immersive ? "text-indigo-300" : "text-indigo-600"
                }`}
              >
                Learn in motion
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {desktopNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? immersive
                        ? "bg-white/10 text-white"
                        : "bg-indigo-50 text-indigo-700"
                      : immersive
                        ? "text-slate-300 hover:bg-white/10 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {email && (
              <span
                className={`hidden max-w-48 truncate text-xs sm:block ${
                  immersive ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {email}
              </span>
            )}
            <details className="relative">
              <summary
                className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl text-sm font-bold transition [&::-webkit-details-marker]:hidden ${
                  immersive
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                aria-label="Open account menu"
              >
                {email?.slice(0, 1).toUpperCase() || "⋯"}
              </summary>
              <div
                className={`absolute right-0 top-12 z-50 w-48 rounded-2xl border p-2 shadow-2xl ${
                  immersive
                    ? "border-white/10 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-950"
                }`}
              >
                <Link
                  className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700"
                  href="/study"
                >
                  Study tools
                </Link>
                <Link
                  className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700"
                  href="/dashboard#add-material"
                >
                  Add material
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className={immersive ? "pb-20" : "pb-24 md:pb-0"}>{children}</div>

      <nav
        className={
          immersive
            ? "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/90 px-3 py-2 text-white backdrop-blur-xl md:hidden"
            : "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 text-slate-700 backdrop-blur md:hidden"
        }
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <MobileNavLink href="/feed" label="Learn" active={isActive(pathname, "/feed")} immersive={immersive} icon="⌂" />
          <MobileNavLink href="/dashboard" label="Library" active={isActive(pathname, "/dashboard")} immersive={immersive} icon="▤" />
          <MobileNavLink href="/dashboard#add-material" label="Add" active={false} immersive={immersive} icon="+" prominent />
          <MobileNavLink href="/tutor" label="Tutor" active={isActive(pathname, "/tutor")} immersive={immersive} icon="?" />
          <MobileNavLink href="/study" label="More" active={isActive(pathname, "/study")} immersive={immersive} icon="•••" />
        </div>
      </nav>
    </div>
  );
}

function MobileNavLink({
  href,
  label,
  icon,
  active,
  immersive,
  prominent = false,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  immersive: boolean;
  prominent?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${
        prominent
          ? "text-indigo-300"
          : active
            ? immersive
              ? "bg-white/10 text-white"
              : "bg-indigo-50 text-indigo-700"
            : immersive
              ? "text-slate-400 hover:bg-white/10 hover:text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <span className={prominent ? "flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-lg leading-none text-white" : "text-base leading-none"} aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  );
}
