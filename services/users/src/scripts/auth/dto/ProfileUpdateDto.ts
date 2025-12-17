import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for profile update (authenticated customer)
 */
export interface ProfileUpdateParams {
  customerId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  avatar?: string;
}

/**
 * Result of profile update
 */
export interface ProfileUpdateResult extends AuthResultBase {
  customerId?: string;
}
