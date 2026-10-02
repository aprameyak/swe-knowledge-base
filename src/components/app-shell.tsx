"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Clock,
  Compass,
  Home,
  LogOut,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

const NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/timeline", label: "Timeline", icon: Clock },
  { href: "/app/recall", label: "Recall", icon: Search },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/projects", label: "Projects", icon: Briefcase },
  { href: "/app/use", label: "Use", icon: Compass },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--bg-elevated)]/80 px-3 py-5 backdrop-blur md:flex">
        <Link href="/app" className="mb-8 px-2">
          <div className="font-display text-2xl tracking-tight text-[var(--ink)]">
            Strand
          </div>
        </Link>

        <Link href="/app" className="mb-4">
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4" />
            Capture
          </Button>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-medium"
                    : "text-[var(--ink-muted)] hover:bg-black/[0.03] hover:text-[var(--ink)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--line)] pt-4 px-2">
          <div className="text-sm font-medium text-[var(--ink)] truncate">
            {user.name}
          </div>
          <div className="text-xs text-[var(--ink-faint)] truncate">
            {user.email}
          </div>
          <button
            onClick={() => void logout()}
            className="mt-3 flex items-center gap-2 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg)]/85 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app" className="font-display text-xl">
            Strand
          </Link>
          <Link href="/app">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Capture
            </Button>
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <nav className="sticky bottom-0 z-20 flex border-t border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur md:hidden">
          {NAV.filter((item) => item.href !== "/app/projects").map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[10px]",
                  active ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {pathname !== "/app" && (
        <Link
          href="/app"
          className="fixed bottom-6 right-6 hidden items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-[var(--accent-ink)] md:flex"
        >
          <Plus className="h-4 w-4" />
          Capture
        </Link>
      )}
    </div>
  );
}
