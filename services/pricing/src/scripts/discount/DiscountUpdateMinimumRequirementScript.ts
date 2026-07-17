import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountAggregate,
  DiscountMinimumRequirementWriteInput,
} from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateMinimumRequirementParams,
  DiscountUpdateMinimumRequirementResult,
} from "./dto/index.js";
import { parsePositiveBigInt } from "./shared.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateMinimumRequirementScript extends BaseDiscountUpdateScript<DiscountUpdateMinimumRequirementParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateMinimumRequirementParams,
  ): Promise<DiscountUpdateMinimumRequirementResult> {
    const input = params.minimumRequirement.requirement;
    if (aggregate.discount.kind === "BUY_X_GET_Y" && input != null) {
      return sectionErrors([
        {
          message:
            "Buy X Get Y discounts use the requirement defined by their rule",
          code: "MINIMUM_REQUIREMENT_NOT_ALLOWED",
          field: ["requirement"],
        },
      ]);
    }

    const mapped = mapMinimumRequirement(input);
    if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
    await this.repository.discount.replaceMinimumRequirement(
      aggregate.discount.id,
      mapped.value,
    );
    return sectionSuccess();
  }
}

function mapMinimumRequirement(
  input: DiscountUpdateMinimumRequirementParams["minimumRequirement"]["requirement"],
): { value: DiscountMinimumRequirementWriteInput | null; errors: UserError[] } {
  if (input == null) return { value: null, errors: [] };
  const errors: UserError[] = [];
  const subtotalMinor = parsePositiveBigInt(
    input.subtotalMinor,
    ["requirement", "subtotalMinor"],
    errors,
  );
  const quantity = input.quantity ?? null;
  if (
    input.requirementType === "SUBTOTAL" &&
    (subtotalMinor === null || quantity !== null)
  ) {
    errors.push({
      message: "Subtotal requirements require subtotalMinor and no quantity",
      code: "INVALID_MINIMUM_REQUIREMENT",
      field: ["requirement"],
    });
  }
  if (
    input.requirementType === "QUANTITY" &&
    (!quantity ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      subtotalMinor !== null)
  ) {
    errors.push({
      message:
        "Quantity requirements require a positive quantity and no subtotal",
      code: "INVALID_MINIMUM_REQUIREMENT",
      field: ["requirement"],
    });
  }
  return {
    value: { requirementType: input.requirementType, subtotalMinor, quantity },
    errors,
  };
}
