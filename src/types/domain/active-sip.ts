export interface ActiveSIP {
  id: string;
  assetId: string;
  monthlyAmount: number;
  startDate: string;
  status: "active" | "stopped";
  stoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewActiveSIP = Pick<ActiveSIP, "assetId" | "monthlyAmount">;
