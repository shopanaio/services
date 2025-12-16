import type { LocaleCode } from "../../../resolvers/admin/interfaces/index.js";
import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for profile update (authenticated customer)
 */
export interface ProfileUpdateParams {
  customerId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: LocaleCode;
  avatar?: string;
}

/**
 * Result of profile update
 */
export interface ProfileUpdateResult extends AuthResultBase {
  customerId?: string;
}
