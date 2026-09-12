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
 * CRUD for a user's Active SIPs. Amount edits go through a direct update()
 * (not stop+re-add) per user feedback that in-place editing is worth the
 * simplicity — the audit trigger on active_sips (see schema.sql) already
 * captures the before/after on every update, so nothing is lost by editing
 * in place instead of forcing a new row.
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

  /** In-place amount edit — see the class-level doc comment for why this replaced the earlier stop+re-add-only design. */
  async updateAmount(id: string, monthlyAmount: number): Promise<ActiveSIP> {
    if (isDemoMode()) {
      const sip = demoActiveSIPs.find((s) => s.id === id);
      if (!sip) throw new Error("SIP not found");
      sip.monthlyAmount = monthlyAmount;
      sip.updatedAt = new Date().toISOString();
      return sip;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("active_sips").update({ monthly_amount: monthlyAmount }).eq("id", id).select().single();
    if (error) throw error;
    return rowToActiveSIP(data as ActiveSIPRow);
  },

  /** Flips status to 'stopped' and stamps stopped_at. Kept for the "paused, might resume, want it excluded from projections but not gone" case — distinct from delete(), which removes the row outright. */
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

  /** Removes a SIP entirely. Still audit-logged (active_sips is in the audit-trigger table list — see schema.sql), just no longer visible in the active list. */
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
