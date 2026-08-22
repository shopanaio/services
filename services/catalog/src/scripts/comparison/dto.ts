import type { UserError } from "../../kernel/BaseScript.js";
import type { ComparisonProfile } from "../../repositories/models/comparison.js";
import type {
  ComparisonCardinality,
  ComparisonValueType,
} from "../../repositories/comparison/comparison-types.js";

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
export interface ComparisonProfileMutationResult {
  profile?: ComparisonProfile;
  userErrors: UserError[];
}
