import type { UserError } from "../../../kernel/BaseScript.js";

export interface StoreDeleteParams {
  id: string;
}

export interface StoreDeleteResult {
  deletedStoreId?: string;
  userErrors: UserError[];
}
