import type { CustomerResultBase } from "./shared.js";

/**
 * Parameters for updating a customer
 */
export interface CustomerUpdateParams {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  isForbidden?: boolean;
}

/**
 * Result of customer update
 */
export interface CustomerUpdateResult extends CustomerResultBase {
  customerId?: string;
}
