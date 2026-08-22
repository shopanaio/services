import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";

interface WarehouseOperationMeta {
  readonly fieldPrefix: readonly string[];
}

export type WarehouseUpdateOperation =
  | Readonly<{
      type: "warehouseFieldsUpdate";
      code?: string;
      name?: string;
      isDefault?: boolean;
      meta: WarehouseOperationMeta;
    }>
  | Readonly<{
      type: "warehouseStockCreate" | "warehouseStockDelete";
      variantId: string;
      meta: WarehouseOperationMeta;
    }>;

export interface WarehouseUpdateInput {
  readonly warehouseId: string;
  readonly operations: readonly WarehouseUpdateOperation[];
  readonly context: DurableWorkflowContext;
}

export interface WarehouseOperationResult {
  readonly type: WarehouseUpdateOperation["type"];
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}

export interface WarehouseUpdateResult {
  readonly warehouse: { readonly id: string } | null;
  readonly operationResults: readonly WarehouseOperationResult[];
  readonly userErrors: readonly UserError[];
}
