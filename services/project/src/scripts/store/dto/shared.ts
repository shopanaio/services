import type { UserError } from "../../../kernel/BaseScript.js";
import type { StoreWithIntegrations } from "../../../repositories/index.js";

export interface StorePayload {
  store?: StoreWithIntegrations;
  userErrors: UserError[];
}
