import type { UserError } from "@shopana/shared-kernel";

export interface StoreDeleteParams {
  id: string;
  organizationId: string;
}

export interface StoreDeleteResult {
  deletedStoreId?: string;
  userErrors: UserError[];
}
