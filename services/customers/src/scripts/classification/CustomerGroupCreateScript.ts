import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";

export interface CustomerGroupCreateParams {
  code: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CustomerGroupCreateResult {
  group?: { id: string };
  userErrors: UserError[];
}

export class CustomerGroupCreateScript extends BaseScript<
  CustomerGroupCreateParams,
  CustomerGroupCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerGroupCreateParams
  ): Promise<CustomerGroupCreateResult> {
    const code = params.code.trim().toLowerCase();
    const errors: UserError[] = [];
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(code)) {
      errors.push({
        message: "Group code must contain only lowercase letters, numbers, _ or -",
        code: "INVALID_CODE",
        field: ["code"],
      });
    }
    if (params.name.trim().length === 0) {
      errors.push({
        message: "Group name cannot be empty",
        code: "INVALID_NAME",
        field: ["name"],
      });
    }
    if (params.isDefault === true && params.isActive === false) {
      errors.push({
        message: "An inactive group cannot be the default group",
        code: "DEFAULT_GROUP_INACTIVE",
        field: ["isDefault"],
      });
    }
    if (await this.repository.group.findByCode(code)) {
      errors.push(duplicateGroupCodeError());
    }
    if (errors.length > 0) {
      return { group: undefined, userErrors: errors };
    }

    try {
      const group = await this.repository.group.create({
        ...params,
        code,
        name: params.name.trim(),
        isDefault: params.isDefault ?? false,
        isActive: params.isActive ?? true,
      });
      this.logger.info({ groupId: group.id }, "Customer group created");
      return { group: { id: group.id }, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "customer_group_store_code_unique")) {
        return { group: undefined, userErrors: [duplicateGroupCodeError()] };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerGroupCreateResult {
    return {
      group: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function duplicateGroupCodeError(): UserError {
  return {
    message: "A customer group with this code already exists",
    code: "DUPLICATE_GROUP_CODE",
    field: ["code"],
  };
}
