import { TopBar } from "@/components/layout/top-bar";
import { isDemoMode } from "@/lib/database/client";
import { auditService } from "@/lib/services/audit.service";
import { AuditLogView } from "@/features/audit/components/audit-log-view";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const entries = isDemoMode() ? [] : await auditService.listRecent(200);
  return (
    <div>
      <TopBar title="Audit Log" subtitle="Every edit and delete to your financial records, automatically kept" />
      <AuditLogView entries={entries} isDemoMode={isDemoMode()} />
    </div>
  );
}
