import { TopBar } from "@/components/layout/top-bar";
import { ppfService } from "@/lib/services/ppf.service";
import { PPFView } from "@/features/ppf/components/ppf-view";

export const dynamic = "force-dynamic";

export default async function PPFPage() {
  const accounts = await ppfService.listAll();
  return (
    <div>
      <TopBar title="PPF" subtitle="Public Provident Fund — balances and contributions" />
      <PPFView accounts={accounts} />
    </div>
  );
}
