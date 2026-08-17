import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";

export interface CustomerMergeCreateParams {
  sourceCustomerId: string;
  targetCustomerId: string;
  reason?: string | null;
}

export interface CustomerMergeCreateResult {
  merge?: { id: string };
  userErrors: UserError[];
}

export class CustomerMergeCreateScript extends BaseScript<
  CustomerMergeCreateParams,
  CustomerMergeCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerMergeCreateParams
  ): Promise<CustomerMergeCreateResult> {
    const errors = await this.validate(params);
    if (errors.length > 0) {
      return { merge: undefined, userErrors: errors };
    }

    try {
      const merge = await this.repository.lifecycle.createMerge({
        sourceCustomerId: params.sourceCustomerId,
        targetCustomerId: params.targetCustomerId,
        reason: params.reason ?? null,
        requestedByType: this.context.hasUser ? "user" : "service",
        requestedById: this.context.hasUser ? this.currentUser.id : null,
        idempotencyKey: `${this.context.requestId}:customerMergeCreate`,
      });
      if (!merge) {
        return {
          merge: undefined,
          userErrors: [
            {
              message: "An active merge already exists for the source customer",
              code: "MERGE_ALREADY_PENDING",
              field: ["sourceCustomerId"],
            },
          ],
        };
      }
      this.logger.info(
        {
          mergeId: merge.id,
          sourceCustomerId: params.sourceCustomerId,
          targetCustomerId: params.targetCustomerId,
        },
        "Customer merge requested"
      );
      return { merge: { id: merge.id }, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "customer_merge_source_active_unique")) {
        return {
          merge: undefined,
          userErrors: [
            {
              message: "An active merge already exists for the source customer",
              code: "MERGE_ALREADY_PENDING",
              field: ["sourceCustomerId"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerMergeCreateResult {
    return {
      merge: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private async validate(params: CustomerMergeCreateParams): Promise<UserError[]> {
    if (params.sourceCustomerId === params.targetCustomerId) {
      return [
        {
          message: "Source and target customers must be different",
          code: "SAME_CUSTOMER",
          field: ["targetCustomerId"],
        },
      ];
    }

    const [source, target] = await Promise.all([
      this.repository.customer.findById(params.sourceCustomerId),
      this.repository.customer.findById(params.targetCustomerId),
    ]);
    const errors: UserError[] = [];
    if (!source) {
      errors.push({
        message: "Source customer not found",
        code: "NOT_FOUND",
        field: ["sourceCustomerId"],
      });
    } else if (["MERGED", "REDACTED"].includes(source.lifecycleStatus)) {
      errors.push({
        message: "Source customer cannot be merged",
        code: "INVALID_CUSTOMER_STATE",
        field: ["sourceCustomerId"],
      });
    }
    if (!target) {
      errors.push({
        message: "Target customer not found",
        code: "NOT_FOUND",
        field: ["targetCustomerId"],
      });
    } else if (["MERGED", "REDACTED"].includes(target.lifecycleStatus)) {
      errors.push({
        message: "Target customer cannot receive a merge",
        code: "INVALID_CUSTOMER_STATE",
        field: ["targetCustomerId"],
      });
    }
    return errors;
  }
}
