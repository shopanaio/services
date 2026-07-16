import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerMergePatch } from "../../repositories/lifecycle/CustomerLifecycleRepository.js";

export interface CustomerMergeUpdateParams {
  id: string;
  operations: {
    sourceCustomerId?: string | null;
    targetCustomerId?: string | null;
    reason?: string | null;
  };
}

export interface CustomerMergeUpdateResult {
  merge?: { id: string };
  userErrors: UserError[];
}

export class CustomerMergeUpdateScript extends BaseScript<
  CustomerMergeUpdateParams,
  CustomerMergeUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerMergeUpdateParams
  ): Promise<CustomerMergeUpdateResult> {
    const current = await this.repository.lifecycle.findMergeById(params.id);
    if (!current) return notFound();
    if (current.status !== "REQUESTED") return invalidState();

    const sourceCustomerId = hasOwn(params.operations, "sourceCustomerId")
      ? params.operations.sourceCustomerId
      : current.sourceCustomerId;
    const targetCustomerId = hasOwn(params.operations, "targetCustomerId")
      ? params.operations.targetCustomerId
      : current.targetCustomerId;
    const errors: UserError[] = [];
    if (!sourceCustomerId) {
      errors.push({
        message: "Source customer cannot be null",
        code: "INVALID_VALUE",
        field: ["sourceCustomerId"],
      });
    }
    if (!targetCustomerId) {
      errors.push({
        message: "Target customer cannot be null",
        code: "INVALID_VALUE",
        field: ["targetCustomerId"],
      });
    }
    if (!sourceCustomerId || !targetCustomerId) {
      return { merge: undefined, userErrors: errors };
    }
    if (sourceCustomerId === targetCustomerId) {
      errors.push({
        message: "Source and target customers must be different",
        code: "SAME_CUSTOMER",
        field: ["targetCustomerId"],
      });
    }

    const [source, target] = await Promise.all([
      this.repository.customer.findById(sourceCustomerId),
      this.repository.customer.findById(targetCustomerId),
    ]);
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
    if (errors.length > 0) return { merge: undefined, userErrors: errors };

    try {
      const merge = await this.repository.lifecycle.updateMerge(
        params.id,
        mergePatch(params.operations)
      );
      if (!merge) return invalidState();
      this.logger.info({ mergeId: merge.id }, "Customer merge request updated");
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

  protected handleError(_error: unknown): CustomerMergeUpdateResult {
    return {
      merge: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function mergePatch(
  operations: CustomerMergeUpdateParams["operations"]
): CustomerMergePatch {
  const patch: CustomerMergePatch = {};
  for (const field of ["sourceCustomerId", "targetCustomerId", "reason"] as const) {
    if (hasOwn(operations, field)) {
      Object.assign(patch, { [field]: operations[field] });
    }
  }
  return patch;
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerMergeUpdateResult {
  return {
    merge: undefined,
    userErrors: [
      {
        message: "Customer merge not found",
        field: ["mergeId"],
        code: "NOT_FOUND",
      },
    ],
  };
}

function invalidState(): CustomerMergeUpdateResult {
  return {
    merge: undefined,
    userErrors: [
      {
        message: "Only a requested customer merge can be updated",
        field: ["mergeId"],
        code: "INVALID_STATE",
      },
    ],
  };
}
