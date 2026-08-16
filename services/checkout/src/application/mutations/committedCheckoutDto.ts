import type { CheckoutDto, CheckoutLineDto } from "@shopana/checkout-sdk";
import { DeliveryMethodType, ShippingPaymentModel } from "@shopana/checkout-sdk";
import { Money } from "@shopana/shared-money";
import type { CheckoutCommittedSnapshot } from "./contracts.js";
import type { CheckoutPipelineMoney, CheckoutQuotedLine } from "../pipeline/contracts/index.js";

/** Canonical broker projection used by Orders while it still consumes checkout-sdk. */
export function committedCheckoutToDto(checkout: CheckoutCommittedSnapshot): CheckoutDto {
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
  const quote = result.finalPricing.data;
  const delivery = result.delivery.data;
  const totals = quote.totals;
  const loyalty = result.loyalty.status === "SUCCESS" && result.loyalty.data.status === "QUOTED"
    ? result.loyalty.data.quote
    : null;
  const loyaltyReward = result.loyalty.status === "SUCCESS"
    ? result.loyalty.data.rewardQuote
    : null;
  const payableAmount = loyalty?.payableAfterLoyalty ?? totals.payableTotal;
  const lineToDto = (line: CheckoutQuotedLine, parentLineId: string | null): CheckoutLineDto => {
    const sourceLineId = preliminary.sourceLineResolutions.find(
      (resolution) =>
        resolution.status === "TRANSFORMED" &&
        resolution.transformedLineIds.includes(line.lineId),
    )?.sourceLineId ?? line.lineId;
    const discountMinor = line.discountAllocations.reduce(
      (sum, allocation) => sum + BigInt(allocation.amount.amountMinor),
      0n,
    );
    return {
      id: line.lineId,
      title: line.merchandise.title,
      sku: line.merchandise.sku,
      imageSrc: line.merchandise.imageUrl,
      quantity: line.quantity,
      cost: {
        compareAtUnitPrice: line.compareAtUnitPrice ? money(line.compareAtUnitPrice) : null,
        unitPrice: money(line.unitPrice),
        discountAmount: money({
          amountMinor: discountMinor.toString(),
          currencyCode: line.unitPrice.currencyCode,
        }),
        subtotalAmount: money(line.subtotal),
        taxAmount: zero(line.unitPrice.currencyCode),
        totalAmount: money(line.total),
      },
      children: line.children.map((child) => lineToDto(child, line.lineId)),
      purchasableId: line.merchandise.variantId,
      originalPrice: money(line.originalUnitPrice),
      parentLineId,
      componentItemId: componentItemId(draft, sourceLineId),
      tag: lineTag(draft, sourceLineId),
    };
  };
  const lines = quote.lines.map((line) => lineToDto(line, null));
  return {
    id: checkout.checkoutId,
    createdAt: checkout.createdAt,
    updatedAt: checkout.updatedAt,
    storeId: checkout.storeId,
    currencyCode: draft.currencyCode,
    salesChannel: draft.channelCode,
    externalSource: draft.externalSource,
    externalId: draft.externalId,
    localeCode: draft.localeCode,
    cost: {
      subtotalAmount: money(totals.merchandiseSubtotal),
      totalDiscountAmount: money({
        amountMinor: (
          BigInt(totals.merchandiseDiscountTotal.amountMinor) +
          BigInt(totals.deliveryDiscountTotal.amountMinor) + BigInt(loyalty?.discount.amountMinor ?? "0")
        ).toString(),
        currencyCode: totals.payableTotal.currencyCode,
      }),
      totalTaxAmount: money(totals.taxTotal),
      totalShippingAmount: money(totals.deliveryTotal),
      totalAmount: money(payableAmount),
    },
    customerIdentity: {
      countryCode: draft.buyerIdentity?.countryCode ?? null,
      customer: draft.buyerIdentity?.customerId
        ? { id: draft.buyerIdentity.customerId }
        : null,
      email: draft.buyerIdentity?.email ?? null,
      phone: draft.buyerIdentity?.phone ?? null,
      firstName: draft.buyerIdentity?.firstName ?? null,
      lastName: draft.buyerIdentity?.lastName ?? null,
      middleName: draft.buyerIdentity?.middleName ?? null,
    },
    customerNote: draft.customerNote,
    totalQuantity: draft.cartIntent.lines.reduce((sum, line) => sum + line.quantity, 0),
    lines,
    notifications: [],
    deliveryGroups: delivery.groups.map((group) => {
      const destination = draft.cartIntent.destinations.find(
        ({ destinationId }) => destinationId === group.destinationId,
      );
      const methods = group.options.map((option) => ({
        code: option.code,
        deliveryMethodType: legacyDeliveryType(option.deliveryMethodType),
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        provider: {
          code: option.carrier?.code ?? option.source,
          data: option.publicData,
        },
      }));
      const selectedHandle = group.selection.status === "SELECTED"
        ? group.selection.optionHandle
        : null;
      const selected = selectedHandle === null
        ? null
        : group.options.find(({ handle }) => handle === selectedHandle);
      if (group.selection.status === "SELECTED" && !selected) {
        throw new Error("Committed delivery selection does not match an available option");
      }
      return {
        id: group.groupId,
        checkoutLines: selectGroupedLines(
          quote.lines,
          new Set(group.lineIds),
        ).map((line) => lineToDto(line, null)),
        deliveryAddress: destination
          ? {
              id: destination.destinationId,
              address1: destination.address.address1,
              address2: destination.address.address2,
              city: destination.address.city,
              countryCode: destination.address.countryCode,
              provinceCode: destination.address.provinceCode,
              postalCode: destination.address.postalCode,
              email: destination.address.email,
              firstName: destination.address.firstName,
              lastName: destination.address.lastName,
              phone: destination.address.phone,
              data: destination.address.providerData,
            }
          : null,
        deliveryMethods: methods,
        selectedDeliveryMethod: selected
          ? methods[group.options.indexOf(selected)] ?? null
          : null,
        shippingCost: selected
          ? {
              amount: money(selected.cost),
              paymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
            }
          : null,
      };
    }),
    appliedPromoCodes: quote.appliedDiscounts.flatMap((discount) =>
      discount.code
        ? [{
            code: discount.code.inputCode,
            appliedAt: checkout.updatedAt,
            discountType: discount.discountClass,
            value: money(discount.amount),
            provider: discount.source.kind,
            conditions: discount.metadata,
          }]
        : [],
    ),
    createdBy: null,
    number: null,
    status: result.validation.data.valid ? "ready" : "new",
    expiresAt: null,
    version: checkout.version,
    metadata: {
      resultRevision: result.resultRevision,
      loyaltyRedemption: loyalty ? {
        quoteId: loyalty.quoteId,
        quoteRevision: loyalty.revision,
        accountId: loyalty.accountId,
        programId: loyalty.program.programId,
        programVersionId: loyalty.program.programVersionId,
        points: loyalty.redeemablePoints,
        discount: loyalty.discount,
      } : null,
      loyaltyRewardEntitlement: loyaltyReward ? {
        entitlementId: loyaltyReward.entitlementId,
        rewardDefinitionId: loyaltyReward.rewardDefinitionId,
        rewardType: loyaltyReward.rewardType,
        pricingDiscountId: loyaltyReward.pricingDiscountId,
        externalReference: loyaltyReward.externalReference,
        configuration: loyaltyReward.configuration,
      } : null,
    },
    deletedAt: null,
  };
}

function money(value: CheckoutPipelineMoney) {
  return Money.fromMinor(BigInt(value.amountMinor), value.currencyCode).toJSON();
}

function zero(currencyCode: string) {
  return Money.fromMinor(0n, currencyCode).toJSON();
}

function selectGroupedLines(
  lines: readonly CheckoutQuotedLine[],
  selectedIds: ReadonlySet<string>,
): CheckoutQuotedLine[] {
  return lines.flatMap((line) =>
    selectedIds.has(line.lineId)
      ? [line]
      : selectGroupedLines(line.children, selectedIds),
  );
}

function componentItemId(
  draft: CheckoutCommittedSnapshot["draft"],
  lineId: string,
): string | null {
  const line = flattenIntent(draft.cartIntent.lines).find((item) => item.lineId === lineId);
  return line?.componentSelection?.componentItemId ?? null;
}

function lineTag(draft: CheckoutCommittedSnapshot["draft"], lineId: string) {
  const assignment = draft.lineTagAssignments.find((item) => item.lineId === lineId);
  const tag = assignment ? draft.tags.find((item) => item.id === assignment.tagId) : null;
  return tag ? { id: tag.id, slug: tag.slug, isUnique: tag.isUnique } : null;
}

function flattenIntent<T extends { children: readonly T[] }>(lines: readonly T[]): T[] {
  return lines.flatMap((line) => [line, ...flattenIntent(line.children)]);
}

function legacyDeliveryType(
  type: "LOCAL" | "NONE" | "PICK_UP" | "PICKUP_POINT" | "RETAIL" | "SHIPPING",
): DeliveryMethodType {
  if (type === "SHIPPING" || type === "LOCAL") return DeliveryMethodType.SHIPPING;
  if (type === "NONE") return DeliveryMethodType.NONE;
  return DeliveryMethodType.PICKUP;
}
