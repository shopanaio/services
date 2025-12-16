import type { LocaleCode } from "../../../resolvers/admin/interfaces/index.js";
import type { UserResultBase } from "./shared.js";

/**
 * Parameters for updating an admin user
 */
export interface UserUpdateParams {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: LocaleCode;
  isAdmin?: boolean;
  isForbidden?: boolean;
  roles?: string[];
}

/**
 * Result of user update
 */
export interface UserUpdateResult extends UserResultBase {
  userId?: string;
}
