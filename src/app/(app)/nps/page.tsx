import { TopBar } from "@/components/layout/top-bar";
import { npsService } from "@/lib/services/nps.service";
import { NPSView } from "@/features/nps/components/nps-view";

export const dynamic = "force-dynamic";

export default async function NPSPage() {
  const rawAccounts = await npsService.listAccounts();

  // Once an account has an imported statement, its true corpus lives in
  // nps_scheme_holdings (units × NAV per scheme), not the manually-entered
  // current_corpus field — see npsService.getEffectiveCorpus(). Override it
  // here so every downstream display (corpus, total, withdrawal max) is
  // consistent, rather than threading a separate "effective corpus" prop
  // through every place NPSView reads account.currentCorpus.
  const accounts = await Promise.all(rawAccounts.map(async (a) => ({ ...a, currentCorpus: await npsService.getEffectiveCorpus(a) })));

  const contributionsByAccount: Record<string, Awaited<ReturnType<typeof npsService.getContributions>>> = {};
  const projectionsByAccount: Record<string, Awaited<ReturnType<typeof npsService.getProjection>>> = {};

  await Promise.all(
    accounts.map(async (a) => {
      contributionsByAccount[a.id] = await npsService.getContributions(a.id);
      projectionsByAccount[a.id] = await npsService.getProjection(a.id);
    })
  );

  return (
    <div>
      <TopBar title="NPS" subtitle="National Pension System — Tier I / Tier II corpus and projections" />
      <NPSView accounts={accounts} contributionsByAccount={contributionsByAccount} projectionsByAccount={projectionsByAccount} />
    </div>
  );
}
