export const NPS_TIERS = ["Tier I", "Tier II"] as const;
export type NPSTier = (typeof NPS_TIERS)[number];
