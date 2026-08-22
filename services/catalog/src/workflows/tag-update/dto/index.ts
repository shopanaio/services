import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { Tag } from "../../../repositories/models/index.js";
export interface TagUpdateOperation {
  readonly type: "tagFieldsUpdate";
  readonly handle?: string;
  readonly name?: string;
  readonly fieldPath: readonly string[];
}
export interface TagUpdateInput {
  readonly tagId: string;
  readonly operations: readonly TagUpdateOperation[];
  readonly context: DurableWorkflowContext;
}
export interface TagOperationResult {
  readonly type: TagUpdateOperation["type"];
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}
export interface TagUpdateResult {
  readonly tag: { readonly id: string } | null;
  readonly operationResults: readonly TagOperationResult[];
  readonly userErrors: readonly UserError[];
}
export interface TagUpdateScriptParams {
  id: string;
  handle?: string;
  name?: string;
}
export interface TagUpdateScriptResult {
  tag?: Tag;
  affectedProductIds: string[];
  userErrors: UserError[];
}
