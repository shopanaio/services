import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import { normalizeTagDisplayName } from "../../repositories/classification/CustomerTagRepository.js";

export interface CustomerTagCreateParams {
  name: string;
}

export interface CustomerTagCreateResult {
  tag?: { id: string };
  userErrors: UserError[];
}

export class CustomerTagCreateScript extends BaseScript<
  CustomerTagCreateParams,
  CustomerTagCreateResult
> {
  @Transactional()
  protected async execute(params: CustomerTagCreateParams): Promise<CustomerTagCreateResult> {
    const name = normalizeTagDisplayName(params.name);
    if (name.length === 0) {
      return {
        tag: undefined,
        userErrors: [
          {
            message: "Tag name cannot be empty",
            code: "INVALID_NAME",
            field: ["name"],
          },
        ],
      };
    }
    if ([...name].length > 255) {
      return {
        tag: undefined,
        userErrors: [
          {
            message: "Tag name cannot exceed 255 characters",
            code: "INVALID_NAME",
            field: ["name"],
          },
        ],
      };
    }
    if (await this.repository.tag.findByName(name)) {
      return { tag: undefined, userErrors: [duplicateTagNameError()] };
    }

    try {
      const tag = await this.repository.tag.create(name);
      this.logger.info({ tagId: tag.id }, "Customer tag created");
      return { tag: { id: tag.id }, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "customer_tag_store_name_unique")) {
        return { tag: undefined, userErrors: [duplicateTagNameError()] };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerTagCreateResult {
    return {
      tag: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function duplicateTagNameError(): UserError {
  return {
    message: "A customer tag with this name already exists",
    code: "DUPLICATE_TAG_NAME",
    field: ["name"],
  };
}
