import {
  BaseScript,
  Transactional,
  ValidationError,
  type UserError,
} from "../../kernel/BaseScript.js";
import type { DiscountCreateWriteInput } from "../../repositories/DiscountRepository.js";
import { DiscountUpdateChannelsScript } from "./DiscountUpdateChannelsScript.js";
import { DiscountUpdateCodesScript } from "./DiscountUpdateCodesScript.js";
import { DiscountUpdateCombinationsScript } from "./DiscountUpdateCombinationsScript.js";
import { DiscountUpdateEligibilityScript } from "./DiscountUpdateEligibilityScript.js";
import { DiscountUpdateLifecycleScript } from "./DiscountUpdateLifecycleScript.js";
import { DiscountUpdateMinimumRequirementScript } from "./DiscountUpdateMinimumRequirementScript.js";
import { DiscountUpdateRuleScript } from "./DiscountUpdateRuleScript.js";
import { DiscountUpdateTagsScript } from "./DiscountUpdateTagsScript.js";
import { DiscountUpdateTargetsScript } from "./DiscountUpdateTargetsScript.js";
import type { DiscountCreateParams, DiscountCreateResult } from "./dto/index.js";
import { isRecord, parseDateTime, parsePositiveBigInt } from "./shared.js";
import type { DiscountSectionResult } from "./types.js";
import { validateDiscountAggregate } from "./validation.js";

class DiscountCreateValidationError extends ValidationError {
  constructor(public readonly userErrors: UserError[]) {
    super(
      userErrors.map((error) => ({
        message: error.message,
        code: error.code ?? null,
        field: error.field ?? null,
      })),
    );
    this.name = "DiscountCreateValidationError";
  }
}

/** Creates the complete discount aggregate in one transaction. */
export class DiscountCreateScript extends BaseScript<DiscountCreateParams, DiscountCreateResult> {
  @Transactional()
  protected async execute(params: DiscountCreateParams): Promise<DiscountCreateResult> {
    const mappedRoot = this.mapRoot(params);
    if (!mappedRoot.value || mappedRoot.errors.length > 0) {
      return { userErrors: mappedRoot.errors };
    }

    const created = await this.repository.discount.create(mappedRoot.value);
    if (!created.created) {
      return {
        discount: {
          id: created.discount.id,
          revision: created.discount.revision,
        },
        userErrors: [],
      };
    }

    const { discountId, input } = params;
    if (input.functionBinding != null) {
      const activationSequence = parseNonNegativeBigInt(input.functionBinding.activationSequence);
      if (activationSequence === null) {
        throw new DiscountCreateValidationError([
          {
            message: "Activation sequence must be a non-negative integer",
            code: "INVALID_ACTIVATION_SEQUENCE",
            field: ["input", "functionBinding", "activationSequence"],
          },
        ]);
      }
      await this.repository.discount.createFunctionBinding({
        discountId,
        target:
          mappedRoot.value.discountClass === "SHIPPING"
            ? "cart.delivery-options.discounts.generate.run"
            : "cart.lines.discounts.generate.run",
        contractVersion: 1,
        installationId: input.functionBinding.installationId,
        functionKey: input.functionBinding.functionKey.trim(),
        precedence: input.functionBinding.precedence ?? 0,
        activationSequence: Number(activationSequence),
        status: input.functionBinding.status ?? "ACTIVE",
        failureMode: input.functionBinding.failureMode ?? "OPTIONAL",
        configurationSnapshot: input.functionBinding.configurationSnapshot,
        configurationRevision: input.functionBinding.configurationRevision.trim(),
        routeRevision: input.functionBinding.routeRevision.trim(),
      });
    }
    if (input.rule != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateRuleScript, {
          discountId,
          rule: input.rule,
        }),
        ["input", "rule"],
      );
    }
    if (input.minimumRequirement != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateMinimumRequirementScript, {
          discountId,
          minimumRequirement: { requirement: input.minimumRequirement },
        }),
        ["input", "minimumRequirement"],
        "requirement",
      );
    }
    if (input.targetSelections != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateTargetsScript, {
          discountId,
          targetSelections: input.targetSelections,
        }),
        ["input", "targetSelections"],
      );
    }
    if (input.buyerContext != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateEligibilityScript, {
          discountId,
          eligibility: input.buyerContext,
        }),
        ["input", "buyerContext"],
      );
    }
    if (input.codes != null && input.codes.length > 0) {
      this.assertSection(
        await this.executeScript(DiscountUpdateCodesScript, {
          discountId,
          codes: { create: input.codes },
        }),
        ["input", "codes"],
        "create",
      );
    }
    if (input.tags != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateTagsScript, {
          discountId,
          tags: input.tags,
        }),
        ["input", "tags"],
      );
    }
    if (input.channels != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateChannelsScript, {
          discountId,
          channels: input.channels,
        }),
        ["input", "channels"],
      );
    }
    if (input.combinesWith != null) {
      this.assertSection(
        await this.executeScript(DiscountUpdateCombinationsScript, {
          discountId,
          combinations: input.combinesWith,
        }),
        ["input", "combinesWith"],
      );
    }
    if (input.state != null && input.state !== "DRAFT") {
      this.assertSection(
        await this.executeScript(DiscountUpdateLifecycleScript, {
          discountId,
          lifecycle: { state: input.state },
        }),
        ["input"],
      );
    }

    const aggregate = await this.repository.discount.findAggregateById(discountId);
    if (!aggregate) throw new Error("Created discount could not be loaded");
    const aggregateErrors = validateDiscountAggregate(aggregate);
    if (aggregateErrors.length > 0) {
      throw new DiscountCreateValidationError(prefixErrors(aggregateErrors, ["input"]));
    }

    this.logger.info({ discountId }, "Discount created");
    return {
      discount: { id: discountId, revision: aggregate.discount.revision },
      userErrors: [],
    };
  }

  protected handleError(error: unknown): DiscountCreateResult {
    if (error instanceof DiscountCreateValidationError) {
      return { userErrors: error.userErrors };
    }
    return {
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private assertSection(
    result: DiscountSectionResult,
    prefix: string[],
    wrapperField?: string,
  ): void {
    if (result.userErrors.length === 0) return;
    throw new DiscountCreateValidationError(prefixErrors(result.userErrors, prefix, wrapperField));
  }

  private mapRoot(params: DiscountCreateParams): {
    value?: DiscountCreateWriteInput;
    errors: UserError[];
  } {
    const { input } = params;
    const errors: UserError[] = [];
    const title = input.title?.trim() || null;
    if (title && title.length > 255) {
      errors.push({
        message: "Discount title cannot exceed 255 characters",
        code: "INVALID_TITLE",
        field: ["input", "title"],
      });
    }
    if (input.method === "AUTOMATIC" && !title) {
      errors.push({
        message: "Automatic discounts require a title",
        code: "TITLE_REQUIRED",
        field: ["input", "title"],
      });
    }

    const priority = input.priority ?? 0;
    if (!Number.isSafeInteger(priority) || priority < 0) {
      errors.push({
        message: "Priority must be a non-negative integer",
        code: "INVALID_PRIORITY",
        field: ["input", "priority"],
      });
    }

    const usageLimit = parsePositiveBigInt(
      input.usage?.usageLimit,
      ["input", "usage", "usageLimit"],
      errors,
    );
    const appliesOncePerCustomer = input.usage?.appliesOncePerCustomer ?? false;
    if (input.method === "AUTOMATIC" && (usageLimit !== null || appliesOncePerCustomer)) {
      errors.push({
        message: "Automatic discounts cannot have customer or aggregate usage limits",
        code: "INVALID_USAGE_LIMIT",
        field: ["input", "usage"],
      });
    }

    const appliesOnOneTimePurchase = input.purchaseModes?.appliesOnOneTimePurchase ?? true;
    const appliesOnSubscription = input.purchaseModes?.appliesOnSubscription ?? false;
    if (!appliesOnOneTimePurchase && !appliesOnSubscription) {
      errors.push({
        message: "At least one purchase mode must be enabled",
        code: "PURCHASE_MODE_REQUIRED",
        field: ["input", "purchaseModes"],
      });
    }

    const parsedStartsAt = input.schedule
      ? parseDateTime(input.schedule.startsAt, ["input", "schedule", "startsAt"], errors)
      : undefined;
    const startsAt = parsedStartsAt ?? undefined;
    const endsAt =
      input.schedule?.endsAt == null
        ? null
        : parseDateTime(input.schedule.endsAt, ["input", "schedule", "endsAt"], errors);
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      errors.push({
        message: "Discount end time must be after its start time",
        code: "INVALID_SCHEDULE",
        field: ["input", "schedule", "endsAt"],
      });
    }

    const metadata = input.metadata ?? {};
    if (!isRecord(metadata)) {
      errors.push({
        message: "Metadata must be a JSON object",
        code: "INVALID_METADATA",
        field: ["input", "metadata"],
      });
    }
    if (this.context.store.currencyCode !== input.currency) {
      errors.push({
        message: "Currency is not enabled for this store",
        code: "INVALID_CURRENCY",
        field: ["input", "currency"],
      });
    }

    const calculationStrategy = input.calculationStrategy ?? "NATIVE";
    if (calculationStrategy === "NATIVE" && input.kind == null) {
      errors.push({
        message: "Native discounts require a kind",
        code: "KIND_REQUIRED",
        field: ["input", "kind"],
      });
    }
    if (calculationStrategy === "FUNCTION" && (!input.discountClass || !input.functionBinding)) {
      errors.push({
        message: "Function discounts require discountClass and functionBinding",
        code: "FUNCTION_BINDING_REQUIRED",
        field: ["input", "functionBinding"],
      });
    }
    if (calculationStrategy === "FUNCTION" && (input.kind != null || input.rule != null)) {
      errors.push({
        message: "Function discounts cannot define a native kind or rule",
        code: "INVALID_FUNCTION_DISCOUNT",
        field: ["input"],
      });
    }
    if (
      input.functionBinding &&
      (!input.functionBinding.functionKey.trim() ||
        !input.functionBinding.configurationRevision.trim() ||
        !input.functionBinding.routeRevision.trim() ||
        !isRecord(input.functionBinding.configurationSnapshot))
    ) {
      errors.push({
        message: "Function binding identifiers and configuration must be valid",
        code: "INVALID_FUNCTION_BINDING",
        field: ["input", "functionBinding"],
      });
    }
    if (
      input.functionBinding &&
      (!Number.isSafeInteger(input.functionBinding.precedence ?? 0) ||
        (input.functionBinding.precedence ?? 0) < 0)
    ) {
      errors.push({
        message: "Function binding precedence must be a non-negative integer",
        code: "INVALID_FUNCTION_BINDING",
        field: ["input", "functionBinding", "precedence"],
      });
    }

    if (errors.length > 0 || (input.schedule && !startsAt)) {
      return { errors };
    }
    return {
      value: {
        id: params.discountId,
        method: input.method,
        calculationStrategy,
        kind: calculationStrategy === "NATIVE" ? input.kind! : null,
        discountClass:
          calculationStrategy === "NATIVE"
            ? discountClassForKind(input.kind!)
            : input.discountClass!,
        title,
        currency: input.currency,
        priority,
        usageLimit,
        appliesOncePerCustomer,
        appliesOnOneTimePurchase,
        appliesOnSubscription,
        startsAt,
        endsAt,
        createdById: params.createdById ?? null,
        metadata,
      },
      errors,
    };
  }
}

function parseNonNegativeBigInt(value: string): bigint | null {
  if (!/^\d+$/.test(value)) return null;
  try {
    const parsed = BigInt(value);
    return parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? parsed : null;
  } catch {
    return null;
  }
}

function discountClassForKind(
  kind: DiscountCreateParams["input"]["kind"],
): "PRODUCT" | "ORDER" | "SHIPPING" {
  if (kind === "AMOUNT_OFF_ORDER") return "ORDER";
  if (kind === "FREE_SHIPPING") return "SHIPPING";
  return "PRODUCT";
}

function prefixErrors(errors: UserError[], prefix: string[], wrapperField?: string): UserError[] {
  return errors.map((error) => ({
    ...error,
    field: error.field
      ? [
          ...prefix,
          ...(wrapperField && error.field[0] === wrapperField ? error.field.slice(1) : error.field),
        ]
      : prefix,
  }));
}
