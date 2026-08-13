import { TopBar } from "@/components/layout/top-bar";
import { npsService } from "@/lib/services/nps.service";
import { NPSView } from "@/features/nps/components/nps-view";

export const dynamic = "force-dynamic";

export default async function NPSPage() {
  const accounts = await npsService.listAccounts();

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
