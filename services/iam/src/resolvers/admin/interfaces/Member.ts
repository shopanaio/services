import type { User } from "./User.js";

/**
 * Member - a user with role assignment in a specific domain
 */
export interface Member {
  id: string;
  user: User;
  role: string;
  grantedAt: Date;
  grantedBy: User | null;
}
