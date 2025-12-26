import type { UserError } from "@shopana/shared-kernel";

export interface LocaleUpdatePayload {
  success: boolean;
  userErrors: UserError[];
}
