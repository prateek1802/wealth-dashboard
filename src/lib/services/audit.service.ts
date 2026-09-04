import { auditRepository } from "@/lib/database/repositories/audit.repository";

export const auditService = {
  async listRecent(limit: number = 200) {
    return auditRepository.findRecent(limit);
  },

  async listForRecord(tableName: string, recordId: string) {
    return auditRepository.findForRecord(tableName, recordId);
  },

  async restore(auditLogId: string) {
    return auditRepository.restore(auditLogId);
  },
};
