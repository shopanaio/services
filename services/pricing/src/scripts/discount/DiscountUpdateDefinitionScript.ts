import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountAggregate,
  DiscountRootPatch,
} from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateDefinitionParams,
  DiscountUpdateDefinitionResult,
} from "./dto/index.js";
import { hasOwn, parseDateTime, parsePositiveBigInt } from "./shared.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateDefinitionScript extends BaseDiscountUpdateScript<DiscountUpdateDefinitionParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateDefinitionParams,
  ): Promise<DiscountUpdateDefinitionResult> {
    const input = params.definition;
    const errors: UserError[] = [];
    const patch: DiscountRootPatch = {};

    if (hasOwn(input, "title")) {
      const title = input.title?.trim() || null;
      if (title && title.length > 255) {
        errors.push({
          message: "Discount title cannot exceed 255 characters",
          code: "INVALID_TITLE",
          field: ["title"],
        });
      } else if (aggregate.discount.method === "AUTOMATIC" && !title) {
        errors.push({
          message: "Automatic discounts require a title",
          code: "TITLE_REQUIRED",
          field: ["title"],
        });
      } else {
        patch.title = title;
      }
    }

    if (hasOwn(input, "priority")) {
      if (input.priority == null || !Number.isSafeInteger(input.priority) || input.priority < 0) {
        errors.push({
          message: "Priority must be a non-negative integer",
          code: "INVALID_PRIORITY",
          field: ["priority"],
        });
      } else {
        patch.priority = input.priority;
      }
    }

    if (input.usage != null) {
      const usageLimit = parsePositiveBigInt(
        input.usage.usageLimit,
        ["usage", "usageLimit"],
        errors,
      );
      if (
        aggregate.discount.method === "AUTOMATIC" &&
        (usageLimit !== null || input.usage.appliesOncePerCustomer)
      ) {
        errors.push({
          message: "Automatic discounts cannot have customer or aggregate usage limits",
          code: "INVALID_USAGE_LIMIT",
          field: ["usage"],
        });
      }
      const consumed = aggregate.usageCounter
        ? aggregate.usageCounter.reservedCount +
          aggregate.usageCounter.committedCount -
          aggregate.usageCounter.reversedCount
        : 0n;
      if (usageLimit !== null && usageLimit < consumed) {
        errors.push({
          message: "Usage limit cannot be lower than current reserved and consumed usage",
          code: "USAGE_LIMIT_BELOW_USAGE",
          field: ["usage", "usageLimit"],
        });
      }
      patch.usageLimit = usageLimit;
      patch.appliesOncePerCustomer = input.usage.appliesOncePerCustomer;
    }

    if (input.purchaseModes != null) {
      if (
        !input.purchaseModes.appliesOnOneTimePurchase &&
        !input.purchaseModes.appliesOnSubscription
      ) {
        errors.push({
          message: "At least one purchase mode must be enabled",
          code: "PURCHASE_MODE_REQUIRED",
          field: ["purchaseModes"],
        });
      }
      patch.appliesOnOneTimePurchase = input.purchaseModes.appliesOnOneTimePurchase;
      patch.appliesOnSubscription = input.purchaseModes.appliesOnSubscription;
    }

    if (input.schedule != null) {
      const startsAt = parseDateTime(input.schedule.startsAt, ["schedule", "startsAt"], errors);
      const endsAt =
        input.schedule.endsAt == null
          ? null
          : parseDateTime(input.schedule.endsAt, ["schedule", "endsAt"], errors);
      if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
        errors.push({
          message: "Discount end time must be after its start time",
          code: "INVALID_SCHEDULE",
          field: ["schedule", "endsAt"],
        });
      }
      if (startsAt) patch.startsAt = startsAt;
      patch.endsAt = endsAt;
    }

    if (errors.length > 0) return sectionErrors(errors);
    const changed = await this.repository.discount.updateRoot(aggregate.discount.id, patch);
    return sectionSuccess(changed);
  }
}
