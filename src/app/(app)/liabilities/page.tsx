import { TopBar } from "@/components/layout/top-bar";
import { liabilitiesService } from "@/lib/services/liabilities.service";
import { LiabilitiesView } from "@/features/liabilities/components/liabilities-view";

export const dynamic = "force-dynamic";

export default async function LiabilitiesPage() {
  const liabilities = await liabilitiesService.listAll();
  return (
    <div>
      <TopBar title="Liabilities" subtitle="Credit card dues, loans, and what you owe" />
      <LiabilitiesView liabilities={liabilities} />
    </div>
  );
}
