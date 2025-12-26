import type { UserError } from "@shopana/shared-kernel";

export interface StoreDeleteParams {
  id: string;
}

export interface StoreDeleteResult {
  deletedStoreId?: string;
  userErrors: UserError[];
}
