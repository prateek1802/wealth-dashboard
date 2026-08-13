import { ChartCard } from "@/components/charts/chart-card";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { EmptyState } from "@/components/shared/empty-state";
import { PieChart } from "lucide-react";
import type { AllocationSlice } from "@/types/domain/snapshot";

export function AllocationCard({ slices }: { slices: AllocationSlice[] }) {
  return (
    <ChartCard title="Asset Allocation" className="h-full">
      {slices.length === 0 ? (
        <EmptyState icon={PieChart} title="No holdings yet" description="Add an investment to see your allocation." />
      ) : (
        <AllocationDonut slices={slices} />
      )}
    </ChartCard>
  );
}
