export type SlotStatus = "unassigned" | "assigned" | "bound" | "disabled";

export type SlotScope = "aggregate" | string;

export type AppSlot = {
  id: string;
  project_id: string;
  aggregate: string;
  aggregate_id: string | null;
  scope: SlotScope;
  entity_id: string | null;
  domain: string;
  provider: string;
  status: SlotStatus;
  external_id: string | null;
  capabilities: string[];
  version: number;
  data: Record<string, unknown>;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
};
