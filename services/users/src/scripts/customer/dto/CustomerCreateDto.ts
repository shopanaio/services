import type { LocaleCode } from "../../../resolvers/admin/interfaces/index.js";
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
  locale?: LocaleCode;
}

/**
 * Result of customer creation
 */
export interface CustomerCreateResult extends CustomerResultBase {
  customerId?: string;
}
