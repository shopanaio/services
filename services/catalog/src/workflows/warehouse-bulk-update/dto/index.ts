import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type {
  WarehouseUpdateOperation,
  WarehouseUpdateResult,
} from "../../warehouse-update/dto/index.js";

export interface WarehouseBulkUpdateInput {
  readonly items: readonly Readonly<{
    warehouseId: string;
    operations: readonly WarehouseUpdateOperation[];
  }>[];
  readonly context: DurableWorkflowContext;
}
export interface WarehouseBulkUpdateResult {
  readonly results: readonly Readonly<{ warehouseId: string; result: WarehouseUpdateResult }>[];
}
