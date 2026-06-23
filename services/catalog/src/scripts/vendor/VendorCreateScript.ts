import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type {
  VendorCreateParams,
  VendorCreateResult,
} from "./dto/index.js";

export class VendorCreateScript extends BaseScript<
  VendorCreateParams,
  VendorCreateResult
> {
  @Transactional()
  protected async execute(
    params: VendorCreateParams
  ): Promise<VendorCreateResult> {
    const name = params.name.trim();
    if (!name) {
      return {
        vendor: undefined,
        userErrors: [
          {
            message: "Vendor name is required",
            field: ["name"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const existing = await this.repository.vendor.findByName(name);
    if (existing) {
      return {
        vendor: undefined,
        userErrors: [
          {
            message: "Vendor name already exists",
            field: ["name"],
            code: "DUPLICATE_NAME",
          },
        ],
      };
    }

    try {
      const vendor = await this.repository.vendor.create({ name });

      this.logger.info({ vendorId: vendor.id, name }, "Vendor created");

      return { vendor, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "vendor_project_id_name_key")) {
        return {
          vendor: undefined,
          userErrors: [
            {
              message: "Vendor name already exists",
              field: ["name"],
              code: "DUPLICATE_NAME",
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): VendorCreateResult {
    return {
      vendor: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
