import type { UserError } from "../../../kernel/BaseScript.js";
import type { Store } from "../../../repositories/index.js";

export interface StorePayload {
  store: Store | null;
  userErrors: UserError[];
}
