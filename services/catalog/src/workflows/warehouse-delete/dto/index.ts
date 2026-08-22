import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";

export interface WarehouseDeleteInput {
  readonly warehouseId: string;
  readonly context: DurableWorkflowContext;
}
export interface WarehouseDeleteResult {
  readonly deletedWarehouseId: string | null;
  readonly userErrors: readonly UserError[];
}
