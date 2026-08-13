import { TopBar } from "@/components/layout/top-bar";
import { fdService } from "@/lib/services/fd.service";
import { FDView } from "@/features/fixed-deposits/components/fd-view";

export const dynamic = "force-dynamic";

export default async function FixedDepositsPage() {
  const fds = await fdService.listWithProjections();
  return (
    <div>
      <TopBar title="Fixed Deposits" subtitle="Maturity timeline and expected interest" />
      <FDView fds={fds} />
    </div>
  );
}
