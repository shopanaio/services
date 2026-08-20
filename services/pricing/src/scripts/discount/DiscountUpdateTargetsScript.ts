import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountAggregate,
  DiscountTargetSelectionWriteInput,
} from "../../repositories/DiscountRepository.js";
import type { DiscountUpdateTargetsParams, DiscountUpdateTargetsResult } from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateTargetsScript extends BaseDiscountUpdateScript<DiscountUpdateTargetsParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateTargetsParams,
  ): Promise<DiscountUpdateTargetsResult> {
    const mapped = mapTargetSelections(aggregate.discount.kind, params.targetSelections);
    if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
    await this.repository.discount.replaceTargetSelections(aggregate.discount.id, mapped.value);
    return sectionSuccess();
  }
}

function mapTargetSelections(
  kind: DiscountAggregate["discount"]["kind"],
  inputs: DiscountUpdateTargetsParams["targetSelections"],
): { value: DiscountTargetSelectionWriteInput[]; errors: UserError[] } {
  const errors: UserError[] = [];
  const roles = new Set<string>();
  const value = inputs.map((input, index) => {
    if (roles.has(input.role)) {
      errors.push({
        message: "A target role may only be supplied once",
        code: "DUPLICATE_TARGET_ROLE",
        field: [String(index), "role"],
      });
    }
    roles.add(input.role);
    const targetIds = [...new Set(input.targetIds)];
    if (targetIds.length !== input.targetIds.length) {
      errors.push({
        message: "A target may only be supplied once per selection",
        code: "DUPLICATE_TARGET",
        field: [String(index), "targetIds"],
      });
    }
    if (input.targetType === "ALL_PRODUCTS" && targetIds.length > 0) {
      errors.push({
        message: "ALL_PRODUCTS selections cannot contain target IDs",
        code: "INVALID_TARGET_SELECTION",
        field: [String(index), "targetIds"],
      });
    }
    if (input.targetType !== "ALL_PRODUCTS" && targetIds.length === 0) {
      errors.push({
        message: "Specific target selections require at least one target ID",
        code: "INVALID_TARGET_SELECTION",
        field: [String(index), "targetIds"],
      });
    }
    return { role: input.role, targetType: input.targetType, targetIds };
  });

  if ((kind === "AMOUNT_OFF_ORDER" || kind === "FREE_SHIPPING") && value.length > 0) {
    errors.push({
      message: "Order and shipping discounts cannot have catalog targets",
      code: "TARGETS_NOT_ALLOWED",
    });
  }
  if (kind === "AMOUNT_OFF_PRODUCTS" && value.some((item) => item.role !== "BENEFIT")) {
    errors.push({
      message: "Amount-off product discounts only support BENEFIT targets",
      code: "INVALID_TARGET_ROLE",
    });
  }
  return { value, errors };
}
