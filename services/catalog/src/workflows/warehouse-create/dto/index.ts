import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";

export interface WarehouseCreateInput {
  readonly code: string;
  readonly name: string;
  readonly isDefault?: boolean;
  readonly context: DurableWorkflowContext;
}

export interface WarehouseCreateResult {
  readonly warehouse: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}
