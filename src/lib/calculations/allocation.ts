import type { AllocationCategory } from "@/constants/asset-types";
import type { AllocationSlice } from "@/types/domain/snapshot";

/**
 * Turns a { category: value } map into sorted percentage slices.
 * Used by the Portfolio Aggregation service to union securities + FD + NPS + cash
 * into a single allocation view (point 2 of the revised architecture).
 */
export function calculateAllocation(
  valuesByCategory: Partial<Record<AllocationCategory, number>>
): AllocationSlice[] {
  const entries = Object.entries(valuesByCategory) as [AllocationCategory, number][];
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return entries
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}
