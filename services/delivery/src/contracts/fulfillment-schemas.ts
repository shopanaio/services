import type { Delivery } from "@shopana/broker-types";
import { z } from "zod";
import {
  DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS,
  DELIVERY_PROVIDER_MAX_PACKAGES,
  DeliveryProviderContactSchema,
  DeliveryProviderDestinationSchema,
  DeliveryProviderOriginSchema,
  DeliveryProviderPackageSchema,
  assertDeliveryContractPayloadSize,
} from "./schemas.js";

const identifierSchema = z.string().trim().min(1).max(512);
const revisionSchema = z.number().int().safe().nonnegative();
const timestampSchema = z.string().datetime({ offset: true });

export const DeliveryFulfillmentLineAllocationSchema = z
  .object({
    fulfillmentLineId: identifierSchema,
    orderLineId: identifierSchema,
    checkoutLineId: identifierSchema,
    variantId: identifierSchema,
    quantity: z.number().int().safe().positive(),
  })
  .strict();

export const DeliveryFulfillmentPlanSnapshotSchema = z
  .object({
    fulfillmentId: identifierSchema,
    fulfillmentRevision: revisionSchema,
    organizationId: identifierSchema,
    storeId: identifierSchema,
    orderId: identifierSchema,
    checkoutId: identifierSchema,
    deliveryGroupId: identifierSchema,
    shipmentManagement: z.enum(["DELIVERY_PROVIDER", "MERCHANT"]),
    origin: DeliveryProviderOriginSchema,
    destination: DeliveryProviderDestinationSchema,
    sender: DeliveryProviderContactSchema,
    recipient: DeliveryProviderContactSchema,
    allocations: z
      .array(DeliveryFulfillmentLineAllocationSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    packages: z
      .array(DeliveryProviderPackageSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_PACKAGES),
    planHash: z.string().trim().min(1).max(512),
    fulfillAt: timestampSchema.nullable(),
    fulfillBy: timestampSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const fulfillmentLineIds = value.allocations.map(
      ({ fulfillmentLineId }) => fulfillmentLineId,
    );
    if (new Set(fulfillmentLineIds).size !== fulfillmentLineIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allocations"],
        message: "Fulfillment line IDs must be unique",
      });
    }
    const packageIds = value.packages.map(({ packageId }) => packageId);
    if (new Set(packageIds).size !== packageIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["packages"],
        message: "Package IDs must be unique",
      });
    }

    const allocatedByLine = new Map<string, number>();
    const variantsByLine = new Map<string, string>();
    value.allocations.forEach((allocation) => {
      allocatedByLine.set(
        allocation.checkoutLineId,
        (allocatedByLine.get(allocation.checkoutLineId) ?? 0) +
          allocation.quantity,
      );
      const existingVariant = variantsByLine.get(allocation.checkoutLineId);
      if (existingVariant !== undefined && existingVariant !== allocation.variantId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allocations"],
          message: "One checkout line cannot reference multiple variants",
        });
      }
      variantsByLine.set(allocation.checkoutLineId, allocation.variantId);
    });

    const packagedByLine = new Map<string, number>();
    value.packages.forEach((entry, packageIndex) => {
      entry.items.forEach((item, itemIndex) => {
        packagedByLine.set(
          item.lineId,
          (packagedByLine.get(item.lineId) ?? 0) + item.quantity,
        );
        const expectedVariant = variantsByLine.get(item.lineId);
        if (expectedVariant === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["packages", packageIndex, "items", itemIndex, "lineId"],
            message: "Package item references an unallocated checkout line",
          });
        } else if (expectedVariant !== item.variantId) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["packages", packageIndex, "items", itemIndex, "variantId"],
            message: "Package item variant does not match its allocation",
          });
        }
      });
    });

    for (const [lineId, quantity] of allocatedByLine) {
      if (packagedByLine.get(lineId) !== quantity) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["packages"],
          message: `Packaged quantity must match allocation for checkout line ${lineId}`,
        });
      }
    }
    if (
      value.fulfillAt !== null &&
      value.fulfillBy !== null &&
      Date.parse(value.fulfillBy) < Date.parse(value.fulfillAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillBy"],
        message: "fulfillBy cannot precede fulfillAt",
      });
    }
  });

export const DeliveryFulfillmentAvailabilitySchema = z.union([
  z
    .object({
      status: z.literal("READY"),
      plan: DeliveryFulfillmentPlanSnapshotSchema,
    })
    .strict(),
  z
    .object({
      status: z.enum(["ON_HOLD", "CLOSED", "REVISION_CONFLICT"]),
      code: z.string().trim().min(1).max(128),
      message: z.string().trim().min(1).max(2_000),
      currentRevision: revisionSchema,
    })
    .strict(),
]);

export const DeliveryFulfillmentShipmentUpdateSchema = z
  .object({
    fulfillmentId: identifierSchema,
    expectedFulfillmentRevision: revisionSchema,
    shipmentId: identifierSchema,
    shipmentRevision: revisionSchema,
    state: z.enum([
      "SHIPMENT_CREATED",
      "IN_TRANSIT",
      "DELIVERED",
      "DELIVERY_FAILED",
      "CANCELLED",
    ]),
    occurredAt: timestampSchema,
  })
  .strict();

export function parseDeliveryFulfillmentAvailability(
  value: unknown,
): Delivery.DeliveryFulfillmentAvailability {
  assertDeliveryContractPayloadSize(value, "Delivery fulfillment availability");
  return DeliveryFulfillmentAvailabilitySchema.parse(
    value,
  ) as Delivery.DeliveryFulfillmentAvailability;
}
