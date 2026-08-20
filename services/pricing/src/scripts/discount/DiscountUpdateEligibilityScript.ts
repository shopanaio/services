import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountAggregate,
  DiscountBuyerContextWriteInput,
} from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateEligibilityParams,
  DiscountUpdateEligibilityResult,
} from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateEligibilityScript extends BaseDiscountUpdateScript<DiscountUpdateEligibilityParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateEligibilityParams,
  ): Promise<DiscountUpdateEligibilityResult> {
    const mapped = mapBuyerContext(params.eligibility);
    if (mapped.errors.length > 0 || !mapped.value) {
      return sectionErrors(mapped.errors);
    }
    await this.repository.discount.replaceBuyerContext(aggregate.discount.id, mapped.value);
    return sectionSuccess();
  }
}

function mapBuyerContext(input: DiscountUpdateEligibilityParams["eligibility"]): {
  value: DiscountBuyerContextWriteInput;
  errors: UserError[];
} {
  const errors: UserError[] = [];
  const customerIds = [...new Set(input.customerIds ?? [])];
  const segmentIds = [...new Set(input.segmentIds ?? [])];
  if (customerIds.length !== (input.customerIds?.length ?? 0)) {
    errors.push({
      message: "A customer may only be supplied once",
      code: "DUPLICATE_CUSTOMER",
      field: ["customerIds"],
    });
  }
  if (segmentIds.length !== (input.segmentIds?.length ?? 0)) {
    errors.push({
      message: "A segment may only be supplied once",
      code: "DUPLICATE_SEGMENT",
      field: ["segmentIds"],
    });
  }
  if (input.type === "ALL" && (customerIds.length > 0 || segmentIds.length > 0)) {
    errors.push({
      message: "ALL eligibility cannot contain customers or segments",
      code: "INVALID_ELIGIBILITY",
    });
  }
  if (input.type === "CUSTOMERS" && (customerIds.length === 0 || segmentIds.length > 0)) {
    errors.push({
      message: "CUSTOMERS eligibility requires customers and cannot contain segments",
      code: "INVALID_ELIGIBILITY",
    });
  }
  if (input.type === "SEGMENTS" && (segmentIds.length === 0 || customerIds.length > 0)) {
    errors.push({
      message: "SEGMENTS eligibility requires segments and cannot contain customers",
      code: "INVALID_ELIGIBILITY",
    });
  }
  return { value: { type: input.type, customerIds, segmentIds }, errors };
}
