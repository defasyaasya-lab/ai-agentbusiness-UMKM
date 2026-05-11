"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/riwayat",
    label: "Riwayat",
    icon: History,
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    icon: Settings,
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Navigasi halaman">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition-all duration-300 hover:-translate-y-0.5",
              active
                ? "border-cyan-200 bg-cyan-50/90 text-cyan-800 shadow-[0_10px_30px_rgba(14,165,233,0.12)]"
                : "border-white/70 bg-white/70 text-muted-foreground backdrop-blur hover:border-indigo-100 hover:bg-white/90 hover:text-slate-950",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
