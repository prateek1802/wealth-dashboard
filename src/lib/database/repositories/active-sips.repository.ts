import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoActiveSIPs, nextId } from "@/lib/database/demo-data";
import type { ActiveSIP, NewActiveSIP } from "@/types/domain/active-sip";
import type { ActiveSIPRow } from "@/types/database";

function rowToActiveSIP(row: ActiveSIPRow): ActiveSIP {
  return {
    id: row.id,
    assetId: row.asset_id,
    monthlyAmount: row.monthly_amount,
    startDate: row.start_date,
    status: row.status,
    stoppedAt: row.stopped_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Deliberately minimal CRUD — no generic "update" for changing amount:
 * a SIP amount change is rare enough, and important enough to the resulting
 * projection, that it goes through stop + re-add (a fresh, dated row) rather
 * than a silent in-place edit. See schema.sql's active_sips comment for why
 * there's no future end-date field either.
 */
export const activeSipsRepository = {
  /** All SIPs (active and stopped) for the signed-in user, most-recently-started first. */
  async findAll(): Promise<ActiveSIP[]> {
    if (isDemoMode()) return [...demoActiveSIPs];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("active_sips").select("*").order("start_date", { ascending: false });
    if (error) throw error;
    return (data as ActiveSIPRow[]).map(rowToActiveSIP);
  },

  async create(input: NewActiveSIP): Promise<ActiveSIP> {
    if (isDemoMode()) {
      const sip: ActiveSIP = {
        id: nextId("sip"),
        assetId: input.assetId,
        monthlyAmount: input.monthlyAmount,
        startDate: new Date().toISOString().slice(0, 10),
        status: "active",
        stoppedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      demoActiveSIPs.push(sip);
      return sip;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("active_sips")
      .insert({ asset_id: input.assetId, monthly_amount: input.monthlyAmount })
      .select()
      .single();
    if (error) throw error;
    return rowToActiveSIP(data as ActiveSIPRow);
  },

  /** Flips status to 'stopped' and stamps stopped_at — never deletes, so the SIP's history (and its audit trail) is preserved. */
  async markStopped(id: string): Promise<ActiveSIP> {
    const stoppedAt = new Date().toISOString().slice(0, 10);
    if (isDemoMode()) {
      const sip = demoActiveSIPs.find((s) => s.id === id);
      if (!sip) throw new Error("SIP not found");
      sip.status = "stopped";
      sip.stoppedAt = stoppedAt;
      sip.updatedAt = new Date().toISOString();
      return sip;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("active_sips")
      .update({ status: "stopped", stopped_at: stoppedAt })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToActiveSIP(data as ActiveSIPRow);
  },

  /** Removes a SIP entirely — for correcting an accidental add, not for normal "I stopped contributing" (use markStopped for that, which keeps history). */
  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoActiveSIPs.findIndex((s) => s.id === id);
      if (idx >= 0) demoActiveSIPs.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("active_sips").delete().eq("id", id);
    if (error) throw error;
  },
};
