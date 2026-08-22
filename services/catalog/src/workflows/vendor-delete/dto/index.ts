import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";

export interface VendorDeleteInput {
  readonly vendorId: string;
  readonly context: DurableWorkflowContext;
}

export interface VendorDeleteResult {
  readonly deletedVendorId: string | null;
  readonly userErrors: readonly UserError[];
}
export interface VendorDeleteScriptParams {
  id: string;
}
export interface VendorDeleteScriptResult {
  deletedVendorId?: string;
  userErrors: UserError[];
}
