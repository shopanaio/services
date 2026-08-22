import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { VendorDeleteScriptParams, VendorDeleteScriptResult } from "../dto/index.js";

export class VendorDeleteScript extends BaseScript<
  VendorDeleteScriptParams,
  VendorDeleteScriptResult
> {
  @Transactional()
  protected async execute(params: VendorDeleteScriptParams): Promise<VendorDeleteScriptResult> {
    const current = await this.repository.vendor.findById(params.id);
    if (!current) {
      return {
        userErrors: [{ message: "Vendor not found", field: ["vendorId"], code: "NOT_FOUND" }],
      };
    }

    const deleted = await this.repository.vendor.delete(params.id);
    return deleted
      ? { deletedVendorId: params.id, userErrors: [] }
      : {
          userErrors: [{ message: "Failed to delete vendor", code: "DELETE_FAILED" }],
        };
  }

  protected handleError(): VendorDeleteScriptResult {
    return { userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }] };
  }
}
