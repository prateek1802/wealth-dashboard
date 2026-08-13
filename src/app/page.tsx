import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { ArrowRight, Gem } from "lucide-react";

/**
 * Premium landing page. Authentication is not implemented in V1 — "Open
 * Dashboard" simply enters the app (see MASTER PROMPT "Landing Page").
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex items-center gap-2 px-6 py-6 lg:px-12">
        <Gem className="size-5 text-accent" />
        <span className="font-display text-lg font-medium text-ink">Wealth</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-accent">Personal wealth tracking</p>
        <h1 className="font-display max-w-2xl text-4xl font-medium leading-tight text-ink md:text-6xl">
          Your wealth.
          <br />
          One beautiful dashboard.
        </h1>
        <p className="mt-6 max-w-md text-base text-ink-muted">
          Track investments, understand performance, and see your financial picture clearly.
        </p>
        <Link
          href={ROUTES.dashboard}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Open Dashboard
          <ArrowRight className="size-4" />
        </Link>
      </main>

      <footer className="px-6 py-8 text-center text-xs text-ink-muted">
        A tracking &amp; analytics tool — not a financial advisor.
      </footer>
    </div>
  );
}
