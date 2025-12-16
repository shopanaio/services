import type { LocaleCode } from "../../../resolvers/admin/interfaces/index.js";
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
  locale?: LocaleCode;
  isForbidden?: boolean;
}

/**
 * Result of customer update
 */
export interface CustomerUpdateResult extends CustomerResultBase {
  customerId?: string;
}
