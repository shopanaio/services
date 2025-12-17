import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Base result interface for user scripts
 */
export interface UserResultBase {
  userErrors: UserError[];
}

/**
 * Common user input fields
 */
export interface UserInputBase {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  isAdmin?: boolean;
  isForbidden?: boolean;
  roles?: string[];
}
