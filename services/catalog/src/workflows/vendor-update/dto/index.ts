import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { Vendor } from "../../../repositories/models/index.js";

export interface VendorUpdateOperation {
  readonly type: "vendorFieldsUpdate";
  readonly name: string;
  readonly fieldPath: readonly string[];
}

export interface VendorUpdateInput {
  readonly vendorId: string;
  readonly operations: readonly VendorUpdateOperation[];
  readonly context: DurableWorkflowContext;
}

export interface VendorOperationResult {
  readonly type: VendorUpdateOperation["type"];
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}

export interface VendorUpdateResult {
  readonly vendor: { readonly id: string } | null;
  readonly operationResults: readonly VendorOperationResult[];
  readonly userErrors: readonly UserError[];
}
export interface VendorUpdateScriptParams {
  id: string;
  name: string;
}
export interface VendorUpdateScriptResult {
  vendor?: Vendor;
  userErrors: UserError[];
}
