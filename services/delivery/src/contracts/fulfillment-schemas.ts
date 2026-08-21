import type { Delivery } from "@shopana/broker-types";
import { z } from "zod";
import {
  DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS,
  DELIVERY_PROVIDER_MAX_PACKAGES,
  DeliveryProviderJsonObjectSchema,
  DeliveryProviderMoneySchema,
  DeliveryProviderContactSchema,
  DeliveryProviderDestinationSchema,
  DeliveryProviderOriginSchema,
  DeliveryProviderPackageSchema,
  assertDeliveryContractPayloadSize,
} from "./schemas.js";

const identifierSchema = z.string().trim().min(1).max(512);
const revisionSchema = z.number().int().safe().nonnegative();
const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();

const fulfillmentLineItemInputSchema = z
  .object({
    fulfillmentOrderLineItemId: identifierSchema,
    quantity: z.number().int().safe().positive(),
  })
  .strict();

const committedDeliveryMethodBaseShape = {
  commitmentId: identifierSchema,
  committedAt: timestampSchema,
  deliveryRevision: identifierSchema,
  methodDefinitionId: identifierSchema,
  code: identifierSchema,
  presentedName: z.string().trim().min(1).max(255),
  methodType: z.enum(["LOCAL", "PICK_UP", "PICKUP_POINT", "RETAIL", "SHIPPING"]),
  cost: DeliveryProviderMoneySchema,
  estimatedMinDeliveryAt: nullableTimestampSchema,
  estimatedMaxDeliveryAt: nullableTimestampSchema,
  ratedFactsHash: identifierSchema,
  originalOptionHandle: identifierSchema,
  customerInput: DeliveryProviderJsonObjectSchema.nullable(),
  customerInputHash: identifierSchema.nullable(),
  additionalInformation: DeliveryProviderJsonObjectSchema.nullable(),
};

export const DeliveryCommittedMethodSnapshotSchema = z
  .discriminatedUnion("source", [
    z
      .object({
        ...committedDeliveryMethodBaseShape,
        source: z.literal("MANUAL"),
        serviceCode: identifierSchema,
        carrierServiceAccountId: z.null(),
        carrierCode: z.null(),
        carrierServiceConfigurationRevision: z.null(),
        quoteRevision: z.null(),
      })
      .strict(),
    z
      .object({
        ...committedDeliveryMethodBaseShape,
        source: z.literal("CARRIER_SERVICE"),
        serviceCode: identifierSchema,
        carrierServiceAccountId: identifierSchema,
        carrierCode: identifierSchema,
        carrierServiceConfigurationRevision: identifierSchema,
        quoteRevision: identifierSchema,
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if ((value.customerInput === null) !== (value.customerInputHash === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerInputHash"],
        message: "Committed customer input and its hash must be present together",
      });
    }
    if (
      value.estimatedMinDeliveryAt !== null &&
      value.estimatedMaxDeliveryAt !== null &&
      Date.parse(value.estimatedMaxDeliveryAt) < Date.parse(value.estimatedMinDeliveryAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedMaxDeliveryAt"],
        message: "Committed delivery estimate window is inverted",
      });
    }
  });

export const DeliveryFulfillmentOrderLineItemSnapshotSchema = z
  .object({
    fulfillmentOrderLineItemId: identifierSchema,
    orderLineId: identifierSchema,
    checkoutLineId: identifierSchema,
    variantId: identifierSchema,
    quantity: z.number().int().safe().positive(),
    remainingQuantity: z.number().int().safe().nonnegative(),
    requiresShipping: z.boolean(),
  })
  .strict()
  .refine((value) => value.remainingQuantity <= value.quantity, {
    path: ["remainingQuantity"],
    message: "Remaining quantity cannot exceed ordered quantity",
  });

const fulfillmentOrderAssignedLocationSchema = z.discriminatedUnion("management", [
  z
    .object({
      locationId: identifierSchema,
      management: z.literal("MERCHANT"),
      fulfillmentService: z.null(),
    })
    .strict(),
  z
    .object({
      locationId: identifierSchema,
      management: z.literal("FULFILLMENT_SERVICE"),
      fulfillmentService: z
        .object({
          fulfillmentServiceId: identifierSchema,
          appInstallationId: identifierSchema,
        })
        .strict(),
    })
    .strict(),
]);

export const DeliveryFulfillmentOrderSnapshotSchema = z
  .object({
    fulfillmentOrderId: identifierSchema,
    revision: revisionSchema,
    organizationId: identifierSchema,
    storeId: identifierSchema,
    orderId: identifierSchema,
    checkoutId: identifierSchema,
    deliveryGroupId: identifierSchema,
    status: z.enum([
      "CANCELLED",
      "CLOSED",
      "IN_PROGRESS",
      "INCOMPLETE",
      "ON_HOLD",
      "OPEN",
      "SCHEDULED",
    ]),
    requestStatus: z.enum([
      "ACCEPTED",
      "CANCELLATION_ACCEPTED",
      "CANCELLATION_REJECTED",
      "CANCELLATION_REQUESTED",
      "CLOSED",
      "REJECTED",
      "SUBMITTED",
      "UNSUBMITTED",
    ]),
    supportedActions: z
      .array(
        z.enum([
          "ACCEPT_FULFILLMENT_REQUEST",
          "ACCEPT_CANCELLATION_REQUEST",
          "CLOSE",
          "CREATE_SHIPMENT",
          "HOLD",
          "MARK_INCOMPLETE",
          "MERGE",
          "MOVE",
          "REJECT_FULFILLMENT_REQUEST",
          "REJECT_CANCELLATION_REQUEST",
          "RELEASE_HOLD",
          "SUBMIT_CANCELLATION_REQUEST",
          "SUBMIT_FULFILLMENT_REQUEST",
        ]),
      )
      .max(13),
    assignedLocation: fulfillmentOrderAssignedLocationSchema,
    holds: z
      .array(
        z
          .object({
            holdId: identifierSchema,
            reason: z.enum([
              "AWAITING_PAYMENT",
              "HIGH_RISK_OF_FRAUD",
              "INCORRECT_ADDRESS",
              "INVENTORY_OUT_OF_STOCK",
              "OTHER",
            ]),
            reasonNotes: z.string().trim().min(1).max(2_000).nullable(),
            heldAt: timestampSchema,
          })
          .strict(),
      )
      .max(250),
    deliveryMethod: DeliveryCommittedMethodSnapshotSchema.nullable(),
    lineItems: z
      .array(DeliveryFulfillmentOrderLineItemSnapshotSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    fulfillAt: timestampSchema.nullable(),
    fulfillBy: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const lineItemIds = value.lineItems.map(
      ({ fulfillmentOrderLineItemId }) => fulfillmentOrderLineItemId,
    );
    if (new Set(lineItemIds).size !== lineItemIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineItems"],
        message: "Fulfillment order line item IDs must be unique",
      });
    }
    const checkoutLineIds = value.lineItems.map(({ checkoutLineId }) => checkoutLineId);
    if (new Set(checkoutLineIds).size !== checkoutLineIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineItems"],
        message: "Checkout line IDs must be unique within a fulfillment order",
      });
    }
    if (new Set(value.supportedActions).size !== value.supportedActions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportedActions"],
        message: "Fulfillment order supported actions must be unique",
      });
    }
    const holdIds = value.holds.map(({ holdId }) => holdId);
    if (new Set(holdIds).size !== holdIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["holds"],
        message: "Fulfillment order hold IDs must be unique",
      });
    }
    if ((value.status === "ON_HOLD") !== value.holds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["holds"],
        message: "ON_HOLD status and active holds must be present together",
      });
    }
    if (
      (value.status === "CANCELLED" || value.status === "CLOSED") &&
      value.supportedActions.length > 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportedActions"],
        message: "Terminal fulfillment orders cannot advertise actions",
      });
    }
    if (
      value.supportedActions.includes("CREATE_SHIPMENT") &&
      value.status !== "OPEN" &&
      value.status !== "IN_PROGRESS"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportedActions"],
        message: "Shipment creation requires an open or in-progress fulfillment order",
      });
    }
    if (value.status === "ON_HOLD" && !value.supportedActions.includes("RELEASE_HOLD")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportedActions"],
        message: "A held fulfillment order must advertise RELEASE_HOLD",
      });
    }
    if (value.assignedLocation.management === "MERCHANT" && value.requestStatus !== "UNSUBMITTED") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestStatus"],
        message: "Merchant-managed locations must remain UNSUBMITTED",
      });
    }
    if (value.assignedLocation.management === "MERCHANT") {
      const requestActions = new Set([
        "ACCEPT_FULFILLMENT_REQUEST",
        "ACCEPT_CANCELLATION_REQUEST",
        "REJECT_FULFILLMENT_REQUEST",
        "REJECT_CANCELLATION_REQUEST",
        "SUBMIT_CANCELLATION_REQUEST",
        "SUBMIT_FULFILLMENT_REQUEST",
      ]);
      if (value.supportedActions.some((action) => requestActions.has(action))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supportedActions"],
          message: "Merchant-managed orders cannot advertise fulfillment-service request actions",
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
    if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updatedAt"],
        message: "updatedAt cannot precede createdAt",
      });
    }
  });

export const DeliveryShipmentPlanSnapshotSchema = z
  .object({
    fulfillmentOrder: DeliveryFulfillmentOrderSnapshotSchema,
    lineItems: z
      .array(fulfillmentLineItemInputSchema)
      .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS)
      .nonempty(),
    shipmentProvider: z
      .object({
        providerAccountId: identifierSchema,
        configurationRevision: z.string().trim().min(1).max(512),
      })
      .strict()
      .nullable(),
    origin: DeliveryProviderOriginSchema,
    destination: DeliveryProviderDestinationSchema,
    sender: DeliveryProviderContactSchema,
    recipient: DeliveryProviderContactSchema,
    packages: z.array(DeliveryProviderPackageSchema).min(1).max(DELIVERY_PROVIDER_MAX_PACKAGES),
    planHash: z.string().trim().min(1).max(512),
  })
  .strict()
  .superRefine((value, context) => {
    const packageIds = value.packages.map(({ packageId }) => packageId);
    if (new Set(packageIds).size !== packageIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["packages"],
        message: "Package IDs must be unique",
      });
    }

    const allocationsById = new Map(
      value.fulfillmentOrder.lineItems.map((allocation) => [
        allocation.fulfillmentOrderLineItemId,
        allocation,
      ]),
    );
    const selectedIds = value.lineItems.map(
      ({ fulfillmentOrderLineItemId }) => fulfillmentOrderLineItemId,
    );
    if (new Set(selectedIds).size !== selectedIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineItems"],
        message: "Shipment plan line item IDs must be unique",
      });
    }

    const allocatedByLine = new Map<string, number>();
    const variantsByLine = new Map<string, string>();
    value.lineItems.forEach((selection, selectionIndex) => {
      const allocation = allocationsById.get(selection.fulfillmentOrderLineItemId);
      if (allocation === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lineItems", selectionIndex, "fulfillmentOrderLineItemId"],
          message: "Shipment plan references an unknown fulfillment order line",
        });
        return;
      }
      if (!allocation.requiresShipping || selection.quantity > allocation.remainingQuantity) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lineItems", selectionIndex, "quantity"],
          message: "Shipment quantity must fit an unfulfilled physical allocation",
        });
      }
      allocatedByLine.set(
        allocation.checkoutLineId,
        (allocatedByLine.get(allocation.checkoutLineId) ?? 0) + selection.quantity,
      );
      const existingVariant = variantsByLine.get(allocation.checkoutLineId);
      if (existingVariant !== undefined && existingVariant !== allocation.variantId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fulfillmentOrder", "lineItems"],
          message: "One checkout line cannot reference multiple variants",
        });
      }
      variantsByLine.set(allocation.checkoutLineId, allocation.variantId);
    });

    const packagedByLine = new Map<string, number>();
    value.packages.forEach((entry, packageIndex) => {
      entry.items.forEach((item, itemIndex) => {
        packagedByLine.set(item.lineId, (packagedByLine.get(item.lineId) ?? 0) + item.quantity);
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
    if (value.origin.fulfillmentLocationId !== value.fulfillmentOrder.assignedLocation.locationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origin", "fulfillmentLocationId"],
        message: "Shipment origin must be the fulfillment order assigned location",
      });
    }
    if (
      value.fulfillmentOrder.deliveryMethod?.methodType !== "SHIPPING" &&
      value.fulfillmentOrder.deliveryMethod?.methodType !== "PICKUP_POINT"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillmentOrder", "deliveryMethod", "methodType"],
        message: "Only shipping and pickup-point orders can create shipment plans",
      });
    }
    if (
      value.fulfillmentOrder.status !== "OPEN" &&
      value.fulfillmentOrder.status !== "IN_PROGRESS"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillmentOrder", "status"],
        message: "Shipment work requires an open or in-progress fulfillment order",
      });
    }
    if (
      value.fulfillmentOrder.assignedLocation.management === "FULFILLMENT_SERVICE" &&
      value.fulfillmentOrder.requestStatus !== "ACCEPTED" &&
      value.fulfillmentOrder.requestStatus !== "CANCELLATION_REJECTED"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillmentOrder", "requestStatus"],
        message: "A fulfillment service must accept the request before shipment work",
      });
    }
  });

export const DeliveryShipmentPlanAvailabilitySchema = z.union([
  z
    .object({
      status: z.literal("READY"),
      plan: DeliveryShipmentPlanSnapshotSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("NOT_READY"),
      reason: z.enum([
        "SCHEDULED",
        "ON_HOLD",
        "FULFILLMENT_REQUEST_NOT_ACCEPTED",
        "NO_SHIPPING_REQUIRED",
        "CLOSED",
        "INVALID_LINE_ITEMS",
      ]),
      code: z.string().trim().min(1).max(128),
      message: z.string().trim().min(1).max(2_000),
      currentRevision: revisionSchema,
    })
    .strict(),
]);

export const DeliveryFulfillmentShipmentUpdateSchema = z
  .object({
    fulfillmentOrderId: identifierSchema,
    shipmentId: identifierSchema,
    shipmentRevision: revisionSchema,
    lineItems: z
      .array(fulfillmentLineItemInputSchema)
      .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS)
      .nonempty(),
    state: z.enum(["SHIPMENT_CREATED", "IN_TRANSIT", "DELIVERED", "DELIVERY_FAILED", "CANCELLED"]),
    occurredAt: timestampSchema,
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.lineItems.map(({ fulfillmentOrderLineItemId }) => fulfillmentOrderLineItemId))
        .size === value.lineItems.length,
    {
      path: ["lineItems"],
      message: "Shipment update line item IDs must be unique",
    },
  );

export function parseDeliveryShipmentPlanAvailability(
  value: unknown,
): Delivery.DeliveryShipmentPlanAvailability {
  assertDeliveryContractPayloadSize(value, "Delivery fulfillment availability");
  return DeliveryShipmentPlanAvailabilitySchema.parse(
    value,
  ) as Delivery.DeliveryShipmentPlanAvailability;
}

export function parseDeliveryCommittedMethodSnapshot(
  value: unknown,
): Delivery.DeliveryCommittedMethodSnapshot {
  assertDeliveryContractPayloadSize(value, "Committed delivery method");
  return DeliveryCommittedMethodSnapshotSchema.parse(
    value,
  ) as Delivery.DeliveryCommittedMethodSnapshot;
}

export function parseDeliveryFulfillmentShipmentUpdate(
  value: unknown,
): Delivery.DeliveryFulfillmentShipmentUpdate {
  assertDeliveryContractPayloadSize(value, "Delivery fulfillment shipment update");
  return DeliveryFulfillmentShipmentUpdateSchema.parse(value);
}
