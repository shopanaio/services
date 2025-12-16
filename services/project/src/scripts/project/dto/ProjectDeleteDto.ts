import type { UserError } from "../../../kernel/BaseScript.js";

export interface ProjectDeleteParams {
  id: string;
}

export interface ProjectDeleteResult {
  deletedProjectId?: string;
  userErrors: UserError[];
}
