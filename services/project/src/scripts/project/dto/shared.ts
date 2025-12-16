import type { UserError } from "../../../kernel/BaseScript.js";
import type { Project } from "../../../repositories/models/index.js";

export interface ProjectPayload {
  project?: Project;
  userErrors: UserError[];
}
