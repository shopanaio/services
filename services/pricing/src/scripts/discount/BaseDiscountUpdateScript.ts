import {
  BaseScript,
  Transactional,
  ValidationError,
  type UserError,
} from "../../kernel/BaseScript.js";
import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import {
  internalSectionError,
  sectionErrors,
  type DiscountSectionResult,
} from "./types.js";
import { validateDiscountAggregate } from "./validation.js";

export interface BaseDiscountUpdateParams {
  readonly discountId: string;
}

class DiscountAggregateValidationError extends ValidationError {
  constructor(public readonly userErrors: UserError[]) {
    super(
      userErrors.map((error) => ({
        message: error.message,
        code: error.code ?? null,
        field: error.field ?? null,
      })),
    );
    this.name = "DiscountAggregateValidationError";
  }
}

/**
 * Shared transaction boundary for discount section scripts.
 * Each concrete script owns exactly one update operation.
 */
export abstract class BaseDiscountUpdateScript<
  TParams extends BaseDiscountUpdateParams,
> extends BaseScript<TParams, DiscountSectionResult> {
  protected readonly allowArchived: boolean = false;

  protected abstract update(
    aggregate: DiscountAggregate,
    params: TParams,
  ): Promise<DiscountSectionResult>;

  @Transactional()
  protected async execute(params: TParams): Promise<DiscountSectionResult> {
    const aggregate = await this.repository.discount.findAggregateById(
      params.discountId,
    );
    if (!aggregate) {
      return sectionErrors([
        { message: "Discount not found", code: "NOT_FOUND" },
      ]);
    }

    if (aggregate.discount.state === "ARCHIVED" && !this.allowArchived) {
      return sectionErrors([
        {
          message: "Archived discounts cannot be modified",
          code: "DISCOUNT_ARCHIVED",
        },
      ]);
    }

    const result = await this.update(aggregate, params);
    if (result.userErrors.length > 0 || !result.changed) return result;

    const updated = await this.repository.discount.findAggregateById(
      params.discountId,
    );
    if (!updated) throw new Error("Discount disappeared during update");

    const aggregateErrors = validateDiscountAggregate(updated);
    if (aggregateErrors.length > 0) {
      throw new DiscountAggregateValidationError(aggregateErrors);
    }
    return result;
  }

  protected handleError(error: unknown): DiscountSectionResult {
    if (error instanceof DiscountAggregateValidationError) {
      return sectionErrors(error.userErrors);
    }
    return internalSectionError();
  }
}
