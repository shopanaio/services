import type { UserError } from "@shopana/shared-kernel";

export interface CurrencyUpdatePayload {
  success: boolean;
  userErrors: UserError[];
}
