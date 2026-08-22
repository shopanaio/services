import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
export interface ComparisonProfileDeleteInput {
  readonly comparisonProfileId: string;
  readonly context: DurableWorkflowContext;
}
export interface ComparisonProfileDeleteResult {
  readonly deletedComparisonProfileId: string | null;
  readonly userErrors: readonly UserError[];
}
export interface ComparisonProfileDeleteScriptResult {
  deletedProfileId?: string;
  userErrors: UserError[];
}
