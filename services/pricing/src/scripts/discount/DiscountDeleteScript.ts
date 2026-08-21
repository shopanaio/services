import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { getPgErrorInfo, PG_ERROR_CODES } from "../../kernel/types.js";
import type { DiscountDeleteParams, DiscountDeleteResult } from "./dto/index.js";

export class DiscountDeleteScript extends BaseScript<DiscountDeleteParams, DiscountDeleteResult> {
  @Transactional()
  protected async execute(params: DiscountDeleteParams): Promise<DiscountDeleteResult> {
    const aggregate = await this.repository.discount.findAggregateById(params.id);
    if (!aggregate) {
      return errorResult({
        message: "Discount not found",
        code: "NOT_FOUND",
        field: ["input", "id"],
      });
    }
    if (aggregate.discount.state !== "DRAFT") {
      return deleteNotAllowed();
    }

    const hasCounterUsage =
      hasUsage(aggregate.usageCounter) || aggregate.codeUsageCounters.some(hasUsage);
    if (hasCounterUsage || (await this.repository.discount.hasUsageHistory(params.id))) {
      return deleteNotAllowed();
    }

    const deleted = await this.repository.discount.deleteDraft(params.id);
    if (!deleted) {
      return errorResult({ message: "Discount not found", code: "NOT_FOUND" });
    }

    this.logger.info({ discountId: params.id }, "Discount deleted");
    return {
      deletedDiscountId: params.id,
      deletedCodeIds: aggregate.codes.map((code) => code.id),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): DiscountDeleteResult {
    if (getPgErrorInfo(error)?.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
      return deleteNotAllowed();
    }
    return errorResult({ message: "Internal error", code: "INTERNAL_ERROR" });
  }
}

function hasUsage(
  counter: {
    reservedCount: bigint;
    committedCount: bigint;
    reversedCount: bigint;
  } | null,
): boolean {
  return Boolean(
    counter &&
    (counter.reservedCount > 0n || counter.committedCount > 0n || counter.reversedCount > 0n),
  );
}

function deleteNotAllowed(): DiscountDeleteResult {
  return errorResult({
    message: "Only unused draft discounts can be permanently deleted",
    code: "DISCOUNT_DELETE_NOT_ALLOWED",
    field: ["input", "id"],
  });
}

function errorResult(error: DiscountDeleteResult["userErrors"][number]): DiscountDeleteResult {
  return { deletedCodeIds: [], userErrors: [error] };
}
