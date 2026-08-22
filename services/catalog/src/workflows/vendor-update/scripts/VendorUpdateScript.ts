import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../../kernel/types.js";
import type { VendorUpdateScriptParams, VendorUpdateScriptResult } from "../dto/index.js";

export class VendorUpdateScript extends BaseScript<
  VendorUpdateScriptParams,
  VendorUpdateScriptResult
> {
  @Transactional()
  protected async execute(params: VendorUpdateScriptParams): Promise<VendorUpdateScriptResult> {
    const current = await this.repository.vendor.findById(params.id);
    if (!current) {
      return {
        userErrors: [{ message: "Vendor not found", field: ["vendorId"], code: "NOT_FOUND" }],
      };
    }

    const name = params.name.trim();
    if (!name) {
      return {
        userErrors: [
          { message: "Vendor name is required", field: ["operations", "name"], code: "REQUIRED" },
        ],
      };
    }

    if (name === current.name) return { vendor: current, userErrors: [] };
    const owner = await this.repository.vendor.findByName(name);
    if (owner && owner.id !== params.id) {
      return {
        userErrors: [
          {
            message: "Vendor name already exists",
            field: ["operations", "name"],
            code: "DUPLICATE_NAME",
          },
        ],
      };
    }

    try {
      const vendor = await this.repository.vendor.update(params.id, { name });
      return vendor
        ? { vendor, userErrors: [] }
        : {
            userErrors: [{ message: "Vendor not found", field: ["vendorId"], code: "NOT_FOUND" }],
          };
    } catch (error) {
      if (isUniqueViolation(error, "vendor_store_id_name_key")) {
        return {
          userErrors: [
            {
              message: "Vendor name already exists",
              field: ["operations", "name"],
              code: "DUPLICATE_NAME",
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(): VendorUpdateScriptResult {
    return { userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }] };
  }
}
