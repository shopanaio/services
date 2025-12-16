import type { UserResultBase } from "./shared.js";

/**
 * Parameters for deleting an admin user
 */
export interface UserDeleteParams {
  id: string;
  permanent?: boolean;
}

/**
 * Result of user deletion
 */
export interface UserDeleteResult extends UserResultBase {
  deletedUserId?: string;
}
