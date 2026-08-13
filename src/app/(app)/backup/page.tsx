import { TopBar } from "@/components/layout/top-bar";
import { isDemoMode } from "@/lib/database/client";
import { BackupView } from "@/features/backup/components/backup-view";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  return (
    <div>
      <TopBar title="Backup" subtitle="Export or import all of your data" />
      <BackupView isDemoMode={isDemoMode()} />
    </div>
  );
}
