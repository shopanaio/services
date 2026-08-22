import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
export interface TagDeleteInput {
  readonly tagId: string;
  readonly context: DurableWorkflowContext;
}
export interface TagDeleteResult {
  readonly deletedTagId: string | null;
  readonly userErrors: readonly UserError[];
}
export interface TagDeleteScriptParams {
  id: string;
}
export interface TagDeleteScriptResult {
  deletedTagId?: string;
  affectedProductIds: string[];
  userErrors: UserError[];
}
