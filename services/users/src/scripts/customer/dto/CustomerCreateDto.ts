import type { CustomerResultBase } from "./shared.js";

/**
 * Parameters for creating a new customer
 */
export interface CustomerCreateParams {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
}

/**
 * Result of customer creation
 */
export interface CustomerCreateResult extends CustomerResultBase {
  customerId?: string;
}
