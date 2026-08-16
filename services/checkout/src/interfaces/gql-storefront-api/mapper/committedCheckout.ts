import { Money } from "@shopana/shared-money";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type {
  ApiCheckout,
  ApiCheckoutDeliveryMethodType,
  ApiCheckoutIssueEffect,
  ApiCheckoutIssueSeverity,
  ApiCheckoutSelectionStatus,
  ApiCountryCode,
  ApiCurrencyCode,
  ApiMoney,
  ApiPaymentFlow,
} from "../types.js";
import { encodeGlobalIdByType } from "../idCodec.js";
import type { CheckoutCommittedSnapshot } from "../../../application/mutations/contracts.js";
import type {
  CheckoutCartLineIntent,
  CheckoutPipelineMoney,
} from "../../../application/pipeline/contracts/index.js";

export function mapCommittedCheckoutToApi(
  checkout: CheckoutCommittedSnapshot,
): ApiCheckout {
  const { draft, result } = checkout;
  if (result.preliminaryPricing.status !== "SUCCESS") {
    throw new Error("Committed checkout contains an incomplete pipeline result");
  }
  if (result.delivery.status !== "SUCCESS") {
    throw new Error("Committed checkout contains an incomplete pipeline result");
  }
  if (result.finalPricing.status !== "SUCCESS") {
    throw new Error("Committed checkout contains an incomplete pipeline result");
  }
  if (result.payment.status !== "SUCCESS") {
    throw new Error("Committed checkout contains an incomplete pipeline result");
  }
  if (result.validation.status !== "SUCCESS") {
    throw new Error("Committed checkout contains an incomplete pipeline result");
  }
  const preliminary = result.preliminaryPricing.data;
  const finalQuote = result.finalPricing.data;
  const delivery = result.delivery.data;
  const payment = result.payment.data;
  const loyalty = result.loyalty.status === "SUCCESS" && result.loyalty.data.status === "QUOTED"
    ? result.loyalty.data.quote
    : null;
  const loyaltyReward = result.loyalty.status === "SUCCESS"
    ? result.loyalty.data.rewardQuote
    : null;
  const buyer = draft.buyerIdentity;
  const allQuotedLines = flatten(finalQuote.lines);
  const sourceFor = (lineId: string) =>
    preliminary.sourceLineResolutions.find(
      (resolution) =>
        resolution.status === "TRANSFORMED" &&
        resolution.transformedLineIds.includes(lineId),
    )?.sourceLineId ?? lineId;
  const intentById = new Map(flattenIntent(draft.cartIntent.lines).map((line) => [line.lineId, line]));
  const lineToApi = (line: (typeof allQuotedLines)[number]): ApiCheckout["lines"][number] => {
    const sourceLineId = sourceFor(line.lineId);
    const source = intentById.get(sourceLineId);
    const assignment = draft.lineTagAssignments.find(({ lineId }) => lineId === sourceLineId);
    const tag = assignment
      ? draft.tags.find(({ id }) => id === assignment.tagId)
      : undefined;
    const discountMinor = line.discountAllocations.reduce(
      (sum, allocation) => sum + BigInt(allocation.amount.amountMinor),
      0n,
    );
    return {
      __typename: "CheckoutLine",
      id: encodeGlobalIdByType(line.lineId, GlobalIdEntity.CheckoutLine),
      title: line.merchandise.title,
      sku: line.merchandise.sku,
      imageSrc: line.merchandise.imageUrl,
      quantity: line.quantity,
      children: line.children.map(lineToApi),
      componentItemId: source?.componentSelection
        ? encodeGlobalIdByType(
            source.componentSelection.componentItemId,
            GlobalIdEntity.ProductComponentItem,
          )
        : null,
      purchasableId: encodeGlobalIdByType(
        line.merchandise.variantId,
        GlobalIdEntity.Variant,
      ),
      originalPrice: pipelineMoney(line.originalUnitPrice),
      priceConfig: null,
      tag: tag
        ? {
            __typename: "CheckoutTag",
            id: encodeGlobalIdByType(tag.id, GlobalIdEntity.CheckoutTag),
            slug: tag.slug,
            unique: tag.isUnique,
            createdAt: checkout.createdAt,
            updatedAt: checkout.updatedAt,
          }
        : null,
      cost: {
        __typename: "CheckoutLineCost",
        compareAtUnitPrice: pipelineMoney(line.compareAtUnitPrice ?? line.unitPrice),
        unitPrice: pipelineMoney(line.unitPrice),
        discountAmount: pipelineMoney({
          amountMinor: discountMinor.toString(),
          currencyCode: line.unitPrice.currencyCode,
        }),
        subtotalAmount: pipelineMoney(line.subtotal),
        taxAmount: pipelineMoney({
          amountMinor: "0",
          currencyCode: line.unitPrice.currencyCode,
        }),
        totalAmount: pipelineMoney(line.total),
      },
    };
  };
  const deliveryGroups = delivery.groups.map((group) => {
    const destination = draft.cartIntent.destinations.find(
      ({ destinationId }) => destinationId === group.destinationId,
    );
    const options = group.options.map(deliveryOptionToApi);
    const selection = group.selection.status === "SELECTED"
      ? {
          __typename: "CheckoutDeliveryOptionSelection" as const,
          status: "SELECTED" as ApiCheckoutSelectionStatus,
          option: exactSelection(
            options,
            group.selection.optionHandle,
            "Committed delivery selection does not match an available option.",
          ),
          previousOptionHandle: null,
          resetReason: null,
        }
      : group.selection.status === "RESET"
        ? {
            __typename: "CheckoutDeliveryOptionSelection" as const,
            status: "RESET" as ApiCheckoutSelectionStatus,
            option: null,
            previousOptionHandle: group.selection.previousOptionHandle,
            resetReason: {
              __typename: "CheckoutSelectionResetReason" as const,
              code: group.selection.reason.code,
              message: group.selection.reason.message,
            },
          }
        : {
            __typename: "CheckoutDeliveryOptionSelection" as const,
            status: "NONE" as ApiCheckoutSelectionStatus,
            option: null,
            previousOptionHandle: null,
            resetReason: null,
          };
    return {
      __typename: "CheckoutDeliveryGroup" as const,
      id: encodeGlobalIdByType(group.groupId, GlobalIdEntity.CheckoutDeliveryGroup),
      checkoutLines: selectGroupedLines(finalQuote.lines, new Set(group.lineIds)).map(lineToApi),
      deliveryAddress: destination
        ? {
            __typename: "CheckoutDeliveryAddress" as const,
            id: encodeGlobalIdByType(destination.destinationId, GlobalIdEntity.CheckoutDeliveryAddress),
            address1: destination.address.address1,
            address2: destination.address.address2,
            city: destination.address.city,
            countryCode: destination.address.countryCode as ApiCountryCode,
            provinceCode: destination.address.provinceCode,
            postalCode: destination.address.postalCode,
            data: destination.address.providerData ?? {},
          }
        : null,
      recipient: destination
        ? {
            __typename: "CheckoutRecipient" as const,
            firstName: destination.address.firstName,
            middleName: destination.address.middleName,
            lastName: destination.address.lastName,
            email: destination.address.email,
            phone: destination.address.phone,
          }
        : null,
      options,
      selection,
    };
  });
  const methods = payment.methods.map((method) => ({
    __typename: "CheckoutPaymentMethod" as const,
    handle: method.handle,
    code: method.code,
    title: method.title,
    providerCode: method.provider,
    flow: method.flow as ApiPaymentFlow,
  }));
  const paymentSelection = payment.selection.status === "SELECTED"
    ? {
        __typename: "CheckoutPaymentMethodSelection" as const,
        status: "SELECTED" as ApiCheckoutSelectionStatus,
        method: exactSelection(
          methods,
          payment.selection.methodHandle,
          "Committed payment selection does not match an available method.",
        ),
        previousMethodHandle: null,
        resetReason: null,
      }
    : payment.selection.status === "RESET"
      ? {
          __typename: "CheckoutPaymentMethodSelection" as const,
          status: "RESET" as ApiCheckoutSelectionStatus,
          method: null,
          previousMethodHandle: payment.selection.previousMethodHandle,
          resetReason: {
            __typename: "CheckoutSelectionResetReason" as const,
            code: payment.selection.reason.code,
            message: payment.selection.reason.message,
          },
        }
      : {
          __typename: "CheckoutPaymentMethodSelection" as const,
          status: "NONE" as ApiCheckoutSelectionStatus,
          method: null,
          previousMethodHandle: null,
          resetReason: null,
        };
  const totals = finalQuote.totals;
  const payableAmount = loyalty?.payableAfterLoyalty ?? totals.payableTotal;
  const loyaltyDiscountMinor = loyalty ? BigInt(loyalty.discount.amountMinor) : 0n;
  return {
    __typename: "Checkout",
    id: encodeGlobalIdByType(checkout.checkoutId, GlobalIdEntity.Checkout),
    version: checkout.version,
    resultRevision: result.resultRevision,
    valid: result.validation.data.valid,
    issues: result.issues.map((issue) => ({
      __typename: "CheckoutIssue",
      code: issue.code,
      message: issue.message,
      severity: issue.severity as ApiCheckoutIssueSeverity,
      effect: issue.effect as ApiCheckoutIssueEffect,
      field: [...(issue.field ?? [])],
      lineId: issue.lineId
        ? encodeGlobalIdByType(issue.lineId, GlobalIdEntity.CheckoutLine)
        : null,
      retryable: issue.retryable,
    })),
    createdAt: checkout.createdAt,
    updatedAt: checkout.updatedAt,
    totalQuantity: draft.cartIntent.lines.reduce((sum, line) => sum + line.quantity, 0),
    notifications: [],
    lines: finalQuote.lines.map(lineToApi),
    customerIdentity: {
      __typename: "CheckoutCustomerIdentity",
      countryCode: buyer?.countryCode
        ? buyer.countryCode as ApiCountryCode
        : null,
      customer: buyer?.customerId
        ? {
            __typename: "Customer" as const,
            id: encodeGlobalIdByType(
              buyer.customerId,
              GlobalIdEntity.Customer,
            ),
          }
        : null,
      email: buyer?.email ?? null,
      phone: buyer?.phone ?? null,
      firstName: buyer?.firstName ?? null,
      middleName: buyer?.middleName ?? null,
      lastName: buyer?.lastName ?? null,
    },
    customerNote: draft.customerNote,
    cost: {
      __typename: "CheckoutCost",
      subtotalAmount: pipelineMoney(totals.merchandiseSubtotal),
      totalDiscountAmount: pipelineMoney({
        amountMinor: (
          BigInt(totals.merchandiseDiscountTotal.amountMinor) +
          BigInt(totals.deliveryDiscountTotal.amountMinor) + loyaltyDiscountMinor
        ).toString(),
        currencyCode: totals.payableTotal.currencyCode,
      }),
      totalTaxAmount: pipelineMoney(totals.taxTotal),
      totalShippingAmount: pipelineMoney(totals.deliveryTotal),
      totalAmount: pipelineMoney(payableAmount),
    },
    appliedPromoCodes: finalQuote.appliedDiscounts.flatMap((discount) =>
      discount.code
        ? [{
            __typename: "CheckoutPromoCode" as const,
            code: discount.code.inputCode,
            appliedAt: checkout.updatedAt,
            discountType: discount.discountClass,
            value: Number(discount.amount.amountMinor),
            provider: discount.source.kind,
            conditions: discount.metadata,
          }]
        : [],
    ),
    tags: draft.tags.map((tag) => ({
      __typename: "CheckoutTag" as const,
      id: encodeGlobalIdByType(tag.id, GlobalIdEntity.CheckoutTag),
      slug: tag.slug,
      unique: tag.isUnique,
      createdAt: checkout.createdAt,
      updatedAt: checkout.updatedAt,
    })),
    deliveryGroups,
    payment: {
      __typename: "CheckoutPayment",
      methods,
      selection: paymentSelection,
      payableAmount: pipelineMoney(payableAmount),
    },
    loyaltyRedemption: loyalty ? {
      __typename: "CheckoutLoyaltyRedemption",
      quoteId: loyalty.quoteId,
      revision: loyalty.revision,
      accountId: encodeGlobalIdByType(loyalty.accountId, GlobalIdEntity.LoyaltyAccount),
      programId: encodeGlobalIdByType(loyalty.program.programId, GlobalIdEntity.LoyaltyProgram),
      programCode: loyalty.program.programCode,
      programVersion: loyalty.program.programVersion,
      requestedPoints: loyalty.requestedPoints,
      redeemablePoints: loyalty.redeemablePoints,
      availablePoints: loyalty.availablePoints,
      discount: pipelineMoney(loyalty.discount),
      payableAfterLoyalty: pipelineMoney(loyalty.payableAfterLoyalty),
      expiresAt: loyalty.expiresAt,
    } as any,
    loyaltyRewardEntitlementId: loyaltyReward
      ? encodeGlobalIdByType(loyaltyReward.entitlementId, GlobalIdEntity.LoyaltyRewardEntitlement)
      : null,
  };
}

function pipelineMoney(value: CheckoutPipelineMoney): ApiMoney {
  const amount = Money.fromMinor(BigInt(value.amountMinor), value.currencyCode);
  return { amount, currencyCode: value.currencyCode as ApiCurrencyCode };
}

function flatten<T extends { children: readonly T[] }>(lines: readonly T[]): T[] {
  return lines.flatMap((line) => [line, ...flatten(line.children)]);
}

function flattenIntent(lines: readonly CheckoutCartLineIntent[]): CheckoutCartLineIntent[] {
  return flatten(lines);
}

function exactSelection<T extends { handle: string }>(
  values: readonly T[],
  handle: string,
  message: string,
): T {
  const selected = values.find((value) => value.handle === handle);
  if (!selected) throw new Error(message);
  return selected;
}

function selectGroupedLines<T extends { lineId: string; children: readonly T[] }>(
  lines: readonly T[],
  selectedIds: ReadonlySet<string>,
): T[] {
  return lines.flatMap((line) =>
    selectedIds.has(line.lineId)
      ? [line]
      : selectGroupedLines(line.children, selectedIds),
  );
}

function deliveryOptionToApi(
  option: Extract<
    CheckoutCommittedSnapshot["result"]["delivery"],
    { status: "SUCCESS" }
  >["data"]["groups"][number]["options"][number],
) {
  return {
    __typename: "CheckoutDeliveryOption" as const,
    handle: option.handle,
    code: option.code,
    title: option.title,
    description: option.description,
    deliveryMethodType: option.deliveryMethodType as ApiCheckoutDeliveryMethodType,
    cost: pipelineMoney(option.cost),
    estimatedMinDeliveryAt: option.estimatedMinDeliveryAt,
    estimatedMaxDeliveryAt: option.estimatedMaxDeliveryAt,
    phoneRequired: option.phoneRequired,
    customerInputContract: option.customerInputContract,
    publicData: option.publicData,
    carrierCode: option.carrier?.code ?? null,
  };
}
