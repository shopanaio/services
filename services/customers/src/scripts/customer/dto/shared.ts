import type { Customer } from "../../../repositories/models/index.js";
import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Base result interface for customer scripts
 */
export interface CustomerResultBase {
  userErrors: UserError[];
}
