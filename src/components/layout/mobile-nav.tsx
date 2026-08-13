"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { LayoutDashboard, Wallet, Receipt, LineChart, Target } from "lucide-react";

const MOBILE_ITEMS = [
  { href: ROUTES.dashboard, label: "Home", icon: LayoutDashboard },
  { href: ROUTES.portfolio, label: "Portfolio", icon: Wallet },
  { href: ROUTES.transactions, label: "Activity", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
  { href: ROUTES.goals, label: "Goals", icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border-subtle bg-surface-raised lg:hidden">
      {MOBILE_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-accent" : "text-ink-muted"
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
