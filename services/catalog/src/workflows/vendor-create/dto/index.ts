import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { Vendor } from "../../../repositories/models/index.js";

export interface VendorCreateInput {
  readonly name: string;
  readonly context: DurableWorkflowContext;
}

export interface VendorCreateResult {
  readonly vendor: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}
export interface VendorCreateScriptParams {
  name: string;
}
export interface VendorCreateScriptResult {
  vendor?: Vendor;
  userErrors: UserError[];
}
