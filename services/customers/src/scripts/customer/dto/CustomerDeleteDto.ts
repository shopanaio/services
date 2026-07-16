import type { UserError } from "../../../kernel/BaseScript.js";

export interface CustomerDeleteParams {
  readonly id: string;
  readonly expectedRevision?: number;
}

export interface CustomerDeleteResult {
  deletedCustomerId?: string;
  revision?: number;
  deletedAt?: string;
  userErrors: UserError[];
}
