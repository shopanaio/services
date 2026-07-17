import type { UserError } from "../../../kernel/BaseScript.js";

export interface DiscountDeleteParams {
  readonly id: string;
  readonly expectedRevision: number;
}

export interface DiscountDeleteResult {
  deletedDiscountId?: string;
  deletedCodeIds: string[];
  userErrors: UserError[];
}
