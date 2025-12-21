import type { UserError } from "../../../kernel/BaseScript.js";
import type { ProjectWithIntegrations } from "../../../repositories/index.js";

export interface ProjectPayload {
  project?: ProjectWithIntegrations;
  userErrors: UserError[];
}
