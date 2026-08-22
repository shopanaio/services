import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { ComparisonProfile } from "../../../repositories/models/comparison.js";
import type {
  ComparisonCardinality,
  ComparisonValueType,
} from "../../../repositories/comparison/comparison-types.js";
export interface ComparisonProfileNestedInput {
  handle: string;
  enabled: boolean;
  name: string;
  missingLabel: string;
  notApplicableLabel: string;
  unavailableLabel: string;
  groups: Array<{
    id?: string;
    handle: string;
    name: string;
    sortIndex: number;
    fields: Array<{
      id?: string;
      handle: string;
      name: string;
      description?: string | null;
      valueType: ComparisonValueType;
      cardinality: ComparisonCardinality;
      canonicalUnit?: string | null;
      sortIndex: number;
      featured: boolean;
      options: Array<{ id?: string; handle: string; name: string; sortIndex: number }>;
    }>;
  }>;
}
export interface ComparisonProfileUpdateOperation {
  readonly type: "comparisonProfileDefinitionReplace";
  readonly definition: ComparisonProfileNestedInput;
  readonly fieldPath: readonly string[];
}
export interface ComparisonProfileUpdateInput {
  readonly comparisonProfileId: string;
  readonly operations: readonly ComparisonProfileUpdateOperation[];
  readonly context: DurableWorkflowContext;
}
export interface ComparisonProfileOperationResult {
  readonly type: ComparisonProfileUpdateOperation["type"];
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}
export interface ComparisonProfileUpdateResult {
  readonly profile: { readonly id: string } | null;
  readonly operationResults: readonly ComparisonProfileOperationResult[];
  readonly userErrors: readonly UserError[];
}
export interface ComparisonProfileUpdateScriptResult {
  profile?: ComparisonProfile;
  userErrors: UserError[];
}
