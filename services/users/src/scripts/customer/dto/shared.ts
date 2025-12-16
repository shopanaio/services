import type { UserError } from "../../../kernel/BaseScript.js";
import type { LocaleCode } from "../../../resolvers/admin/interfaces/index.js";

/**
 * Base result interface for customer scripts
 */
export interface CustomerResultBase {
  userErrors: UserError[];
}

/**
 * Common customer input fields
 */
export interface CustomerInputBase {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: LocaleCode;
  avatar?: string;
  isForbidden?: boolean;
}
