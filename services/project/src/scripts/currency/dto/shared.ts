import type { UserError } from "../../../kernel/BaseScript.js";

export interface CurrencyUpdatePayload {
  success: boolean;
  userErrors: UserError[];
}
