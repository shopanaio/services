import type { CustomerResultBase } from "./shared.js";

/**
 * Parameters for deleting a customer
 */
export interface CustomerDeleteParams {
  id: string;
  permanent?: boolean;
}

/**
 * Result of customer deletion
 */
export interface CustomerDeleteResult extends CustomerResultBase {
  deletedCustomerId?: string;
}
