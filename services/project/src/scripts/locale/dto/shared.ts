import type { UserError } from "../../../kernel/BaseScript.js";

export interface LocaleUpdatePayload {
  success: boolean;
  userErrors: UserError[];
}
