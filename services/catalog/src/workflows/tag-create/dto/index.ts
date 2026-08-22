import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { Tag } from "../../../repositories/models/index.js";
export interface TagCreateInput {
  readonly handle: string;
  readonly name?: string;
  readonly context: DurableWorkflowContext;
}
export interface TagCreateResult {
  readonly tag: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}
export interface TagCreateScriptParams {
  handle: string;
  name?: string;
}
export interface TagCreateScriptResult {
  tag?: Tag;
  userErrors: UserError[];
}
