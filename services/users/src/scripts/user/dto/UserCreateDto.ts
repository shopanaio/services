import type { UserResultBase } from "./shared.js";

/**
 * Parameters for creating a new admin user
 */
export interface UserCreateParams {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  isAdmin?: boolean;
  roles?: string[];
}

/**
 * Result of user creation
 */
export interface UserCreateResult extends UserResultBase {
  userId?: string;
}
