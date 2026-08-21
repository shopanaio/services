import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  CancelOrderFromCheckoutPlacementV1Params,
  ConfirmOrderFromCheckoutPlacementV1Params,
  CreateOrderFromCheckoutPlacementV1Params,
  GetOrderCheckoutPlacementV1Params,
  OrderLoyaltyRewardEligibilitySnapshot,
} from "@shopana/broker-types";

const uuid = z.string().uuid();
const nonEmpty = z.string().trim().min(1);
const isoDateTime = z.string().datetime({ offset: true });
const money = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
});
const jsonObject = z.record(z.unknown());
const loyaltyRewardEligibility: z.ZodType<OrderLoyaltyRewardEligibilitySnapshot> = z.object({
  customerId: uuid,
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  channelCode: nonEmpty,
  customerEligibilityRevision: nonEmpty,
  segmentIds: z.array(nonEmpty),
  segmentMembershipRevision: nonEmpty,
  eligibleAmountAfterProductDiscountsMinor: z.string().regex(/^\d+$/),
  eligibleAmountAfterAllDiscountsMinor: z.string().regex(/^\d+$/),
  pricingQuoteId: nonEmpty,
  pricingQuoteRevision: nonEmpty,
  lines: z.array(
    z.object({
      orderLineId: uuid,
      productId: nonEmpty,
      variantId: nonEmpty,
      categoryIds: z.array(nonEmpty),
      tagIds: z.array(nonEmpty),
      featureIds: z.array(nonEmpty),
      optionValueIds: z.array(nonEmpty),
      quantity: z.number().int().positive(),
      eligibleAmountAfterProductDiscountsMinor: z.string().regex(/^\d+$/),
      eligibleAmountAfterAllDiscountsMinor: z.string().regex(/^\d+$/),
    }),
  ),
});

const line = z.object({
  id: uuid,
  parentLineId: uuid.nullable(),
  purchasableId: nonEmpty,
  purchasableType: nonEmpty,
  title: nonEmpty,
  sku: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  quantity: z.number().int().positive(),
  requiresShipping: z.boolean(),
  taxable: z.boolean(),
  unitPrice: money,
  compareAtUnitPrice: money.nullable(),
  subtotal: money,
  discount: money,
  tax: money,
  duty: money,
  total: money,
  snapshot: jsonObject,
  dutyLines: z
    .array(
      z.object({
        title: nonEmpty,
        countryCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .nullable(),
        amount: money,
      }),
    )
    .default([]),
});

const deliveryGroup = z.object({
  id: uuid,
  lineIds: z.array(uuid).min(1),
  address: z
    .object({
      id: uuid,
      address1: z.string().nullable(),
      address2: z.string().nullable(),
      city: z.string().nullable(),
      countryCode: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .nullable(),
      provinceCode: z.string().nullable(),
      postalCode: z.string().nullable(),
      company: z.string().nullable(),
      metadata: jsonObject,
    })
    .nullable(),
  recipient: z
    .object({
      id: uuid,
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      middleName: z.string().nullable(),
      email: z.string().email().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  selectedMethod: z
    .object({
      code: nonEmpty,
      provider: nonEmpty,
      title: z.string().nullable(),
      type: nonEmpty,
      paymentModel: z.string().nullable(),
      quotedAmount: money,
      publicData: jsonObject,
    })
    .nullable(),
  deliveryTaxLines: z
    .array(z.object({ title: nonEmpty, rate: nonEmpty, amount: money }))
    .default([]),
});

const snapshot = z
  .object({
    capturedAt: isoDateTime,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    localeCode: z.string().nullable(),
    salesChannel: z.string().nullable(),
    externalSource: z.string().nullable(),
    externalId: z.string().nullable(),
    customer: z.object({
      customerId: uuid.nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      middleName: z.string().nullable(),
      email: z.string().email().nullable(),
      phone: z.string().nullable(),
      countryCode: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .nullable(),
    }),
    cost: z.object({
      subtotal: money,
      discount: money,
      shipping: money,
      tax: money,
      duty: money,
      adjustment: money,
      total: money,
    }),
    lines: z.array(line).min(1),
    discounts: z.array(
      z.object({
        code: z.string().nullable(),
        title: nonEmpty,
        provider: z.string().nullable(),
        targetType: nonEmpty,
        valueType: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]),
        valueAmount: money.nullable(),
        valuePercentage: z.string().nullable(),
        totalAllocatedAmount: money,
        metadata: jsonObject,
      }),
    ),
    taxLines: z.array(z.object({ title: nonEmpty, rate: nonEmpty, amount: money })),
    deliveryGroups: z.array(deliveryGroup),
    selectedPayment: z
      .object({
        code: nonEmpty,
        title: nonEmpty,
        provider: nonEmpty,
        flow: nonEmpty,
        publicData: jsonObject,
      })
      .nullable(),
    customerNote: z.string().nullable(),
    customFields: jsonObject,
    loyaltyRewardEligibility: loyaltyRewardEligibility.nullable(),
    returnPolicy: z
      .object({
        policyId: nonEmpty,
        revision: nonEmpty,
        timeframeDays: z.number().int().positive().nullable(),
        restockingFeePercentage: z.string().nullable(),
        allowedReasons: z.array(nonEmpty),
        finalizedOrdersOnly: z.boolean(),
        capturedAt: isoDateTime,
      })
      .nullable(),
  })
  .superRefine((value, context) => {
    const currency = value.currencyCode;
    const amounts = [
      ...Object.values(value.cost),
      ...value.lines.flatMap((item) => [
        item.unitPrice,
        ...(item.compareAtUnitPrice ? [item.compareAtUnitPrice] : []),
        item.subtotal,
        item.discount,
        item.tax,
        item.duty,
        item.total,
        ...item.dutyLines.map((dutyLine) => dutyLine.amount),
      ]),
      ...value.deliveryGroups.flatMap((group) => [
        ...(group.selectedMethod ? [group.selectedMethod.quotedAmount] : []),
        ...group.deliveryTaxLines.map((taxLine) => taxLine.amount),
      ]),
    ];
    if (amounts.some((amount) => amount.currencyCode !== currency)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All money must use snapshot currency",
      });
    }
    const lineIds = new Set(value.lines.map(({ id }) => id));
    if (lineIds.size !== value.lines.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Order line IDs must be unique" });
    }
    for (const item of value.lines) {
      if (
        BigInt(item.subtotal.amountMinor) !==
        BigInt(item.unitPrice.amountMinor) * BigInt(item.quantity)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line ${item.id} subtotal is inconsistent`,
        });
      }
      const expected =
        BigInt(item.subtotal.amountMinor) -
        BigInt(item.discount.amountMinor) +
        BigInt(item.tax.amountMinor) +
        BigInt(item.duty.amountMinor);
      if (expected !== BigInt(item.total.amountMinor)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line ${item.id} total is inconsistent`,
        });
      }
    }
    const total =
      BigInt(value.cost.subtotal.amountMinor) -
      BigInt(value.cost.discount.amountMinor) +
      BigInt(value.cost.shipping.amountMinor) +
      BigInt(value.cost.tax.amountMinor) +
      BigInt(value.cost.duty.amountMinor) +
      BigInt(value.cost.adjustment.amountMinor);
    if (total !== BigInt(value.cost.total.amountMinor)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Order total is inconsistent" });
    }
    const assigned = new Set<string>();
    for (const group of value.deliveryGroups) {
      for (const lineId of group.lineIds) {
        const item = value.lines.find(({ id }) => id === lineId);
        if (!item || !item.requiresShipping || assigned.has(lineId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid delivery assignment for ${lineId}`,
          });
        }
        assigned.add(lineId);
      }
    }
    if (value.lines.some((item) => item.requiresShipping && !assigned.has(item.id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Every shippable line requires one delivery group",
      });
    }
  });

export const createOrderFromCheckoutPlacementV1Schema: z.ZodType<CreateOrderFromCheckoutPlacementV1Params> =
  z.object({
    contractVersion: z.literal(1),
    organizationId: uuid,
    storeId: uuid,
    placementId: uuid,
    checkoutId: uuid,
    resultRevision: nonEmpty,
    finalQuote: z.object({ quoteId: nonEmpty, revision: nonEmpty }),
    paymentMethodsRevision: nonEmpty,
    deliveryRevision: nonEmpty,
    requestedOrderId: uuid,
    actor: z.object({ credentialId: nonEmpty, userId: uuid.nullable(), visitorIdHash: nonEmpty }),
    snapshotHash: z.string().regex(/^[0-9a-f]{64}$/),
    snapshot,
    commitments: z.object({
      inventory: z.object({ reservationKey: nonEmpty, expiresAt: isoDateTime }),
      pricing: z.object({ reservationIds: z.array(nonEmpty), redemptionIds: z.array(nonEmpty) }),
      loyalty: z
        .object({
          pointsReservationId: z.string().nullable(),
          rewardEntitlementId: z.string().nullable(),
        })
        .nullable(),
      delivery: z.array(jsonObject),
    }),
    idempotencyKey: nonEmpty,
    correlationId: uuid,
    workflowId: nonEmpty,
  });

export const confirmOrderFromCheckoutPlacementV1Schema: z.ZodType<ConfirmOrderFromCheckoutPlacementV1Params> =
  z.object({
    contractVersion: z.literal(1),
    organizationId: uuid,
    storeId: uuid,
    placementId: uuid,
    orderId: uuid,
    evidence: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("PAYMENT_NOT_REQUIRED") }),
      z.object({
        kind: z.literal("PAYMENT_AUTHORIZED"),
        paymentSessionId: nonEmpty,
        operationId: nonEmpty,
      }),
      z.object({
        kind: z.literal("PAYMENT_CAPTURED"),
        paymentSessionId: nonEmpty,
        operationId: nonEmpty,
      }),
      z.object({ kind: z.literal("OFFLINE_ACCEPTED"), paymentMethodCode: nonEmpty }),
      z.object({ kind: z.literal("ON_DELIVERY_ACCEPTED"), paymentMethodCode: nonEmpty }),
    ]),
    finalizedAt: isoDateTime,
    idempotencyKey: nonEmpty,
    correlationId: uuid,
  });

export const cancelOrderFromCheckoutPlacementV1Schema: z.ZodType<CancelOrderFromCheckoutPlacementV1Params> =
  z.object({
    contractVersion: z.literal(1),
    organizationId: uuid,
    storeId: uuid,
    placementId: uuid,
    orderId: uuid,
    reasonCode: z.enum([
      "PAYMENT_FAILED",
      "PAYMENT_EXPIRED",
      "PAYMENT_CANCELLED",
      "PLACEMENT_FAILED",
    ]),
    paymentSessionId: z.string().nullable(),
    paymentOperationId: z.string().nullable(),
    failedAt: isoDateTime,
    idempotencyKey: nonEmpty,
    correlationId: uuid,
  });

export const getOrderCheckoutPlacementV1Schema: z.ZodType<GetOrderCheckoutPlacementV1Params> =
  z.object({
    contractVersion: z.literal(1),
    organizationId: uuid,
    storeId: uuid,
    placementId: uuid,
    orderId: uuid.optional(),
  });

export function orderPlacementSnapshotHash(
  input: Pick<
    CreateOrderFromCheckoutPlacementV1Params,
    | "contractVersion"
    | "organizationId"
    | "storeId"
    | "placementId"
    | "checkoutId"
    | "checkoutVersion"
    | "resultRevision"
    | "finalQuote"
    | "paymentMethodsRevision"
    | "deliveryRevision"
    | "requestedOrderId"
    | "snapshot"
    | "commitments"
  >,
): string {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}
