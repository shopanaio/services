import type { User } from "../../../repositories/models/index.js";
import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Base result interface for user scripts
 */
export interface UserResultBase {
  userErrors: UserError[];
}
