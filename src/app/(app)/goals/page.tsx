import { TopBar } from "@/components/layout/top-bar";
import { goalsRepository } from "@/lib/database/repositories/goals.repository";
import { GoalsView } from "@/features/goals/components/goals-view";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await goalsRepository.findAll();
  return (
    <div>
      <TopBar title="Goals" subtitle="Track progress toward what matters" />
      <GoalsView goals={goals} />
    </div>
  );
}
