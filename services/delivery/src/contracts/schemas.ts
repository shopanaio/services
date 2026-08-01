import {
  DELIVERY_PROVIDER_PROTOCOL_VERSION,
  DeliveryProviderOperations,
  type Delivery,
} from "@shopana/broker-types";
import type { BrokerCallContext } from "@shopana/shared-kernel";
import { z } from "zod";
import type { DeliveryProviderCompletionContext } from "./actions.js";

const identifierSchema = z.string().trim().min(1).max(512);
const codeSchema = z.string().trim().min(1).max(128);
const correlationIdSchema = z.string().trim().min(1).max(512);
const idempotencyKeySchema = z.string().trim().min(1).max(512);
const revisionSchema = z.string().trim().min(1).max(512);
const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
const jsonObjectSchema = z.record(z.unknown());
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();

export const DeliveryCustomerInputContractSchema = z
  .object({
    schemaDialect: z.literal(
      "https://json-schema.org/draft/2020-12/schema",
    ),
    schema: jsonObjectSchema,
    schemaHash: revisionSchema,
  })
  .strict();

export const DeliveryProviderMoneySchema = z
  .object({
    amountMinor: z.string().regex(/^(0|[1-9]\d*)$/),
    currencyCode: currencyCodeSchema,
  })
  .strict();

export const DeliveryProviderFailureSchema = z
  .object({
    category: z.enum([
      "INVALID_REQUEST",
      "NOT_SUPPORTED",
      "NO_SERVICE",
      "CONFIGURATION",
      "AUTHENTICATION",
      "PROVIDER_UNAVAILABLE",
      "TIMEOUT",
      "RATE_LIMITED",
      "CONFLICT",
      "REJECTED",
      "UNKNOWN",
    ]),
    code: codeSchema,
    message: z.string().trim().min(1).max(2_000),
    retryable: z.boolean(),
    acceptedByProvider: z.boolean(),
    providerCode: codeSchema.nullable(),
  })
  .strict();

export const DeliveryProviderCapabilitiesSchema = z
  .object({
    supportsPickupLocations: z.boolean(),
    supportsDoorDelivery: z.boolean(),
    supportsCarrierCollectedPayment: z.boolean(),
    supportsMerchantCollectedPayment: z.boolean(),
    supportsLabels: z.boolean(),
    supportsMultipleParcels: z.boolean(),
    supportsInternationalShipping: z.boolean(),
    supportsCustomsDeclarations: z.boolean(),
    supportsScheduledDelivery: z.boolean(),
    supportsCancellation: z.boolean(),
    supportsTracking: z.boolean(),
    supportsReconciliation: z.boolean(),
    supportsAsyncCompletion: z.boolean(),
  })
  .strict();

export const DeliveryProviderDimensionsMmSchema = z
  .object({
    width: positiveIntegerSchema,
    height: positiveIntegerSchema,
    length: positiveIntegerSchema,
  })
  .strict();

export const DeliveryProviderLocationAddressSchema = z
  .object({
    countryCode: countryCodeSchema,
    provinceCode: z.string().trim().min(1).max(128).nullable(),
    provinceName: z.string().trim().min(1).max(255).nullable(),
    city: z.string().trim().min(1).max(255),
    postalCode: z.string().trim().min(1).max(64).nullable(),
    addressLine1: z.string().trim().min(1).max(512).nullable(),
    addressLine2: z.string().trim().min(1).max(512).nullable(),
  })
  .strict();

export const DeliveryProviderContactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(255),
    middleName: z.string().trim().min(1).max(255).nullable(),
    lastName: z.string().trim().min(1).max(255),
    company: z.string().trim().min(1).max(255).nullable(),
    email: z.string().email().max(320).nullable(),
    phone: z.string().trim().min(1).max(64).nullable(),
  })
  .strict();

export const DeliveryProviderPackageItemSchema = z
  .object({
    lineId: identifierSchema,
    variantId: identifierSchema,
    sku: z.string().trim().min(1).max(255).nullable(),
    title: z.string().trim().min(1).max(512),
    quantity: positiveIntegerSchema,
    weightGrams: positiveIntegerSchema,
    dimensionsMm: DeliveryProviderDimensionsMmSchema.nullable(),
    declaredValue: DeliveryProviderMoneySchema,
    customs: z
      .object({
        harmonizedSystemCode: z
          .string()
          .regex(/^\d{6,12}$/)
          .nullable(),
        countryOfOriginCode: countryCodeSchema,
        description: z.string().trim().min(1).max(512),
      })
      .strict()
      .nullable(),
    metadata: jsonObjectSchema.nullable(),
  })
  .strict();

export const DeliveryProviderPackageSchema = z
  .object({
    packageId: identifierSchema,
    weightGrams: positiveIntegerSchema,
    dimensionsMm: DeliveryProviderDimensionsMmSchema.nullable(),
    declaredValue: DeliveryProviderMoneySchema,
    items: z.array(DeliveryProviderPackageItemSchema).min(1).max(1_000),
    customs: z
      .object({
        contentsType: z.enum([
          "MERCHANDISE",
          "GIFT",
          "DOCUMENTS",
          "SAMPLE",
          "RETURNED_GOODS",
          "OTHER",
        ]),
        incoterm: z.enum(["DAP", "DDP", "DDU"]),
        nonDeliveryOption: z.enum(["RETURN_TO_SENDER", "ABANDON"]),
        signer: z.string().trim().min(1).max(255).nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const itemWeight = value.items.reduce(
      (sum, item) => sum + item.weightGrams * item.quantity,
      0,
    );
    if (value.weightGrams < itemWeight) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightGrams"],
        message: "Package weight must cover the total item weight",
      });
    }
    const currencies = new Set([
      value.declaredValue.currencyCode,
      ...value.items.map((item) => item.declaredValue.currencyCode),
    ]);
    if (currencies.size !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["declaredValue", "currencyCode"],
        message: "Package and item declared values must use one currency",
      });
    }
    if (
      value.customs !== null &&
      value.items.some((item) => item.customs === null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Every item requires customs data when a declaration exists",
      });
    }
  });

export const DeliveryProviderOriginSchema = z
  .object({
    fulfillmentLocationId: identifierSchema,
    warehouseId: identifierSchema.nullable(),
    address: DeliveryProviderLocationAddressSchema,
  })
  .strict();

export const DeliveryProviderDestinationSchema = z
  .object({
    destinationId: identifierSchema,
    address: DeliveryProviderLocationAddressSchema,
  })
  .strict();

const providerOperationSchema = z.enum([
  DeliveryProviderOperations.validateConfiguration,
  DeliveryProviderOperations.quoteRates,
  DeliveryProviderOperations.searchLocations,
  DeliveryProviderOperations.resolveLocation,
  DeliveryProviderOperations.createShipment,
  DeliveryProviderOperations.cancelShipment,
  DeliveryProviderOperations.getShipment,
  DeliveryProviderOperations.reconcileShipment,
]);

export const DeliveryProviderRouteSnapshotSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    capabilityRouteId: identifierSchema,
    installationId: identifierSchema,
    appCode: codeSchema,
    appVersion: identifierSchema,
    operation: providerOperationSchema,
    routeRevision: revisionSchema,
  })
  .strict();

const deliveryOptionBindingBaseShape = {
  optionHandle: identifierSchema,
  checkoutId: identifierSchema,
  checkoutVersion: nonNegativeIntegerSchema,
  groupId: identifierSchema,
  profileId: identifierSchema,
  methodDefinitionId: identifierSchema,
  preliminaryRevision: revisionSchema,
  ratePlanRevision: revisionSchema,
  eligibilityRevision: revisionSchema,
  customizationRevision: revisionSchema,
  ratedFactsHash: revisionSchema,
  customerInputContract: DeliveryCustomerInputContractSchema.nullable(),
  expiresAt: timestampSchema,
};

export const DeliveryOptionBindingSnapshotSchema = z.discriminatedUnion(
  "source",
  [
    z
      .object({
        ...deliveryOptionBindingBaseShape,
        source: z.literal("PROVIDER"),
        providerAccountId: identifierSchema,
        providerCode: codeSchema,
        providerServiceCode: codeSchema,
        providerQuoteToken: identifierSchema,
        quoteRoute: DeliveryProviderRouteSnapshotSchema.extend({
          operation: z.literal("quoteRates"),
        }),
        configurationRevision: revisionSchema,
        quoteRevision: revisionSchema,
      })
      .strict(),
    z
      .object({
        ...deliveryOptionBindingBaseShape,
        source: z.literal("STATIC"),
        staticRateRevision: nonNegativeIntegerSchema,
      })
      .strict(),
  ],
);

export const DeliveryProviderConfigurationValidationRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    mode: z.enum(["TEST", "LIVE"]),
  })
  .strict();

export const DeliveryProviderConfigurationValidationResultSchema = z
  .object({
    status: z.enum(["READY", "DEGRADED", "INVALID"]),
    providerCode: codeSchema,
    displayName: z.string().trim().min(1).max(255),
    supportedCountryCodes: z.array(countryCodeSchema).max(249),
    supportedCurrencyCodes: z.array(currencyCodeSchema).max(256),
    supportedOperations: z.array(providerOperationSchema).min(1),
    capabilities: DeliveryProviderCapabilitiesSchema,
    failure: DeliveryProviderFailureSchema.nullable(),
    configurationRevision: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.status === "INVALID" && value.failure === null) ||
      (value.status === "READY" && value.failure !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "INVALID requires a failure and READY forbids one",
      });
    }
  });

export const DeliveryProviderRateRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    quoteRequestId: identifierSchema,
    executionId: identifierSchema,
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    effectiveAt: timestampSchema,
    storeId: identifierSchema,
    checkoutId: identifierSchema,
    checkoutVersion: nonNegativeIntegerSchema,
    groupId: identifierSchema,
    ratePlanRevision: revisionSchema,
    eligibilityRevision: revisionSchema,
    ratedFactsHash: revisionSchema,
    currencyCode: currencyCodeSchema,
    localeCode: z.string().trim().min(1).max(64).nullable(),
    channelCode: codeSchema,
    origin: DeliveryProviderOriginSchema,
    destination: DeliveryProviderDestinationSchema,
    packages: z.array(DeliveryProviderPackageSchema).min(1).max(1_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.deadlineAt) <= Date.parse(value.effectiveAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadlineAt"],
        message: "deadlineAt must be after effectiveAt",
      });
    }
    if (
      value.packages.some(
        (entry) => entry.declaredValue.currencyCode !== value.currencyCode,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["packages"],
        message: "Every package declared value must use request currency",
      });
    }
  });

export const DeliveryProviderRateDefinitionSchema = z
  .object({
    serviceCode: codeSchema,
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(2_000).nullable(),
    deliveryMethodType: z.enum(["PICKUP", "SHIPPING"]),
    shippingPaymentModel: z.enum([
      "MERCHANT_COLLECTED",
      "CARRIER_DIRECT",
    ]),
    cost: DeliveryProviderMoneySchema,
    estimatedMinDeliveryAt: nullableTimestampSchema,
    estimatedMaxDeliveryAt: nullableTimestampSchema,
    phoneRequired: z.boolean(),
    quoteToken: identifierSchema,
    expiresAt: timestampSchema,
    customerInputContract: DeliveryCustomerInputContractSchema.nullable(),
    publicData: jsonObjectSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.estimatedMinDeliveryAt !== null &&
      value.estimatedMaxDeliveryAt !== null &&
      Date.parse(value.estimatedMaxDeliveryAt) <
        Date.parse(value.estimatedMinDeliveryAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedMaxDeliveryAt"],
        message: "Delivery estimate window is inverted",
      });
    }
  });

export const DeliveryProviderRateResultSchema = z
  .object({
    quoteRequestId: identifierSchema,
    revision: revisionSchema,
    rates: z.array(DeliveryProviderRateDefinitionSchema).max(1_000),
    warnings: z
      .array(
        z
          .object({
            code: codeSchema,
            message: z.string().trim().min(1).max(2_000),
          })
          .strict(),
      )
      .max(1_000),
    failure: DeliveryProviderFailureSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.failure !== null && value.rates.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "A failed rate result cannot contain rates",
      });
    }
    const serviceCodes = value.rates.map((rate) => rate.serviceCode);
    if (new Set(serviceCodes).size !== serviceCodes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rates"],
        message: "Provider service codes must be unique within one result",
      });
    }
  });

/** Request/result pair validator for the untrusted provider boundary. */
export const DeliveryProviderRateExchangeSchema = z
  .object({
    request: DeliveryProviderRateRequestSchema,
    result: DeliveryProviderRateResultSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.result.quoteRequestId !== value.request.quoteRequestId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result", "quoteRequestId"],
        message: "Provider result does not belong to this quote request",
      });
    }
    for (const [index, rate] of value.result.rates.entries()) {
      if (rate.cost.currencyCode !== value.request.currencyCode) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["result", "rates", index, "cost", "currencyCode"],
          message: "Provider rate currency must match the request currency",
        });
      }
      if (Date.parse(rate.expiresAt) <= Date.parse(value.request.effectiveAt)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["result", "rates", index, "expiresAt"],
          message: "Provider rate must be valid after request effectiveAt",
        });
      }
    }
  });

const pickupLocationTypeSchema = z.enum([
  "BRANCH",
  "LOCKER",
  "STORE",
  "OTHER",
]);

export const DeliveryProviderLocationSearchRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    requestId: identifierSchema,
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    localeCode: z.string().trim().min(1).max(64).nullable(),
    countryCode: countryCodeSchema,
    provinceCode: z.string().trim().min(1).max(128).nullable(),
    city: z.string().trim().min(1).max(255).nullable(),
    postalCode: z.string().trim().min(1).max(64).nullable(),
    query: z.string().trim().min(1).max(512).nullable(),
    locationTypes: z.array(pickupLocationTypeSchema).min(1).max(4),
    first: z.number().int().min(1).max(250),
    after: z.string().trim().min(1).max(1_024).nullable(),
  })
  .strict();

export const DeliveryProviderPickupLocationSchema = z
  .object({
    locationToken: identifierSchema,
    tokenExpiresAt: nullableTimestampSchema,
    providerLocationId: identifierSchema,
    type: pickupLocationTypeSchema,
    name: z.string().trim().min(1).max(512),
    address: DeliveryProviderLocationAddressSchema,
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    openingHours: jsonObjectSchema.nullable(),
    publicData: jsonObjectSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longitude"],
        message: "Latitude and longitude must be present together",
      });
    }
  });

export const DeliveryProviderLocationSearchResultSchema = z
  .object({
    requestId: identifierSchema,
    locations: z.array(DeliveryProviderPickupLocationSchema).max(250),
    pageInfo: z
      .object({
        hasNextPage: z.boolean(),
        endCursor: z.string().trim().min(1).max(1_024).nullable(),
      })
      .strict(),
    failure: DeliveryProviderFailureSchema.nullable(),
  })
  .strict();

export const DeliveryProviderLocationResolveRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    requestId: identifierSchema,
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    localeCode: z.string().trim().min(1).max(64).nullable(),
    locationToken: identifierSchema,
  })
  .strict();

export const DeliveryProviderLocationResolveResultSchema = z
  .object({
    requestId: identifierSchema,
    location: DeliveryProviderPickupLocationSchema.nullable(),
    failure: DeliveryProviderFailureSchema.nullable(),
  })
  .strict();

const shipmentStateSchema = z.enum([
  "CREATED",
  "SUBMITTING",
  "PENDING",
  "ACCEPTED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNING",
  "RETURNED",
  "CANCELLING",
  "CANCELLED",
  "FAILED",
]);

export const DeliveryLabelSnapshotSchema = z
  .object({
    format: z.enum(["PDF", "PNG", "ZPL"]),
    mediaId: identifierSchema.nullable(),
    downloadUrl: z.string().url().max(4_096).nullable(),
    expiresAt: nullableTimestampSchema,
  })
  .strict()
  .refine((value) => value.mediaId !== null || value.downloadUrl !== null, {
    message: "A label requires mediaId or downloadUrl",
  });

export const DeliveryTrackingEventSnapshotSchema = z
  .object({
    providerEventId: identifierSchema,
    parcelId: identifierSchema.nullable(),
    providerParcelReference: identifierSchema.nullable(),
    statusCode: codeSchema,
    state: shipmentStateSchema,
    message: z.string().trim().min(1).max(2_000).nullable(),
    location: DeliveryProviderLocationAddressSchema.nullable(),
    occurredAt: timestampSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.parcelId !== null || value.providerParcelReference === null,
    {
      path: ["parcelId"],
      message: "A provider parcel reference requires a platform parcel ID",
    },
  );

export const DeliveryTrackingSnapshotSchema = z
  .object({
    company: z.string().trim().min(1).max(255).nullable(),
    number: z.string().trim().min(1).max(512),
    url: z.string().url().max(4_096).nullable(),
  })
  .strict();

export const DeliveryParcelSnapshotSchema = z
  .object({
    parcelId: identifierSchema,
    providerParcelReference: identifierSchema.nullable(),
    packageIds: z.array(identifierSchema).min(1).max(1_000),
    state: shipmentStateSchema,
    tracking: z.array(DeliveryTrackingSnapshotSchema).max(100),
    labels: z.array(DeliveryLabelSnapshotSchema).max(100),
    estimatedDeliveryAt: nullableTimestampSchema,
    deliveredAt: nullableTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.packageIds).size !== value.packageIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["packageIds"],
        message: "Parcel package IDs must be unique",
      });
    }
    const trackingNumbers = value.tracking.map((entry) => entry.number);
    if (new Set(trackingNumbers).size !== trackingNumbers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tracking"],
        message: "Parcel tracking numbers must be unique",
      });
    }
    if (value.state === "DELIVERED" && value.deliveredAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveredAt"],
        message: "A delivered parcel requires deliveredAt",
      });
    }
  });

const shipmentRequestBaseShape = {
  protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
  operationId: identifierSchema,
  shipmentId: identifierSchema,
  providerAccountId: identifierSchema,
  idempotencyKey: idempotencyKeySchema,
  idempotencyRequestHash: revisionSchema,
  correlationId: correlationIdSchema,
  deadlineAt: timestampSchema,
};

export const DeliveryProviderCreateShipmentRequestSchema = z
  .object({
    ...shipmentRequestBaseShape,
    operation: z.literal("CREATE"),
    orderReference: identifierSchema,
    fulfillmentReference: identifierSchema,
    fulfillmentPlanHash: revisionSchema,
    ratedFactsHash: revisionSchema,
    providerServiceCode: codeSchema,
    providerQuoteToken: identifierSchema,
    origin: DeliveryProviderOriginSchema,
    destination: DeliveryProviderDestinationSchema,
    sender: DeliveryProviderContactSchema,
    recipient: DeliveryProviderContactSchema,
    packages: z.array(DeliveryProviderPackageSchema).min(1).max(1_000),
    customerInput: jsonObjectSchema.nullable(),
    customerInputHash: revisionSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => (value.customerInput === null) === (value.customerInputHash === null),
    {
      path: ["customerInputHash"],
      message: "customerInput and customerInputHash must be present together",
    },
  );

export const DeliveryProviderCancelShipmentRequestSchema = z
  .object({
    ...shipmentRequestBaseShape,
    operation: z.literal("CANCEL"),
    providerShipmentReference: identifierSchema,
    reason: z.string().trim().min(1).max(1_000).nullable(),
  })
  .strict();

const readShipmentRequestBaseShape = {
  protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
  operationId: identifierSchema,
  shipmentId: identifierSchema,
  providerAccountId: identifierSchema,
  correlationId: correlationIdSchema,
  deadlineAt: timestampSchema,
  providerShipmentReference: identifierSchema,
};

export const DeliveryProviderGetShipmentRequestSchema = z
  .object({
    ...readShipmentRequestBaseShape,
    operation: z.literal("GET"),
  })
  .strict();

export const DeliveryProviderReconcileShipmentRequestSchema = z
  .object({
    ...shipmentRequestBaseShape,
    operation: z.literal("RECONCILE"),
    providerShipmentReference: identifierSchema,
  })
  .strict();

export const DeliveryProviderShipmentOperationResultSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        operation: z.enum(["CREATE", "CANCEL"]),
        status: z.literal("SUCCEEDED"),
        providerShipmentReference: identifierSchema,
        shipmentState: shipmentStateSchema,
        parcels: z.array(DeliveryParcelSnapshotSchema).min(1).max(1_000),
        events: z.array(DeliveryTrackingEventSnapshotSchema).max(10_000),
        processedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        operation: z.enum(["CREATE", "CANCEL"]),
        status: z.literal("PENDING"),
        providerShipmentReference: identifierSchema,
        shipmentState: shipmentStateSchema,
        nextReconcileAt: nullableTimestampSchema,
        observedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        operation: z.enum(["CREATE", "CANCEL"]),
        status: z.literal("FAILED"),
        providerShipmentReference: identifierSchema.nullable(),
        failure: DeliveryProviderFailureSchema,
        failedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
  ],
);

export const DeliveryProviderShipmentExchangeSchema = z
  .object({
    request: z.union([
      DeliveryProviderCreateShipmentRequestSchema,
      DeliveryProviderCancelShipmentRequestSchema,
    ]),
    result: DeliveryProviderShipmentOperationResultSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.request.operation !== value.result.operation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result", "operation"],
        message: "Provider result operation must match the request operation",
      });
    }
    if (
      value.request.operation === "CREATE" &&
      value.result.status === "SUCCEEDED"
    ) {
      const expected = value.request.packages.map((entry) => entry.packageId);
      const actual = value.result.parcels.flatMap((entry) => entry.packageIds);
      if (
        expected.length !== actual.length ||
        expected.some((packageId) => !actual.includes(packageId)) ||
        new Set(actual).size !== actual.length
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["result", "parcels"],
          message: "Successful create must assign every package exactly once",
        });
      }
    }
  });

export const DeliveryProviderReconcileShipmentResultSchema = z
  .object({
    status: z.literal("RECONCILED"),
    providerShipmentReference: identifierSchema,
    shipmentState: shipmentStateSchema,
    parcels: z.array(DeliveryParcelSnapshotSchema).min(1).max(1_000),
    events: z.array(DeliveryTrackingEventSnapshotSchema).max(10_000),
    observedAt: timestampSchema,
    metadata: jsonObjectSchema.nullable(),
  })
  .strict();

export const DeliveryProviderExternalEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("SHIPMENT_STATUS_CHANGED"),
      providerShipmentReference: identifierSchema,
      shipmentState: shipmentStateSchema,
      parcel: DeliveryParcelSnapshotSchema.nullable(),
      event: DeliveryTrackingEventSnapshotSchema,
      metadata: jsonObjectSchema.nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SHIPMENT_LABEL_AVAILABLE"),
      providerShipmentReference: identifierSchema,
      parcelId: identifierSchema,
      providerParcelReference: identifierSchema.nullable(),
      label: DeliveryLabelSnapshotSchema,
      metadata: jsonObjectSchema.nullable(),
    })
    .strict(),
]);

export const CompleteDeliveryProviderOperationParamsSchema = z
  .union([
    z
      .object({
        protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
        shipmentId: identifierSchema,
        operationId: identifierSchema,
        providerEventId: identifierSchema,
        occurredAt: timestampSchema,
        operationType: z.enum(["CREATE", "CANCEL"]),
        result: DeliveryProviderShipmentOperationResultSchema,
      })
      .strict(),
    z
      .object({
        protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
        shipmentId: identifierSchema,
        operationId: identifierSchema,
        providerEventId: identifierSchema,
        occurredAt: timestampSchema,
        operationType: z.enum(["GET", "RECONCILE"]),
        result: DeliveryProviderReconcileShipmentResultSchema,
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (
      (value.operationType === "CREATE" ||
        value.operationType === "CANCEL") &&
      "operation" in value.result &&
      value.result.operation !== value.operationType
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result", "operation"],
        message: "Provider result operation must match operationType",
      });
    }
  });

export const ReportDeliveryProviderEventParamsSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    providerAccountId: identifierSchema,
    providerEventId: identifierSchema,
    occurredAt: timestampSchema,
    event: DeliveryProviderExternalEventSchema,
  })
  .strict();

export const DeliveryLifecycleActionSchemas = {
  configureProviderAccount: z
    .object({
      organizationId: identifierSchema,
      storeId: identifierSchema,
      installationId: identifierSchema,
      mode: z.enum(["TEST", "LIVE"]),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  setProviderAccountStatus: z
    .object({
      storeId: identifierSchema,
      providerAccountId: identifierSchema,
      expectedAccountRevision: nonNegativeIntegerSchema,
      status: z.enum(["ACTIVE", "INACTIVE"]),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  getProviderAccount: z
    .object({
      storeId: identifierSchema,
      providerAccountId: identifierSchema,
    })
    .strict(),
  searchPickupLocations: z
    .object({
      storeId: identifierSchema,
      providerAccountId: identifierSchema,
      request: DeliveryProviderLocationSearchRequestSchema,
    })
    .strict(),
  resolvePickupLocation: z
    .object({
      storeId: identifierSchema,
      providerAccountId: identifierSchema,
      request: DeliveryProviderLocationResolveRequestSchema,
    })
    .strict(),
  createShipment: z
    .object({
      storeId: identifierSchema,
      fulfillmentId: identifierSchema,
      expectedFulfillmentRevision: nonNegativeIntegerSchema,
      checkoutId: identifierSchema,
      groupId: identifierSchema,
      optionHandle: identifierSchema,
      deliveryRevision: revisionSchema,
      customerInput: jsonObjectSchema.nullable(),
      effectiveAt: timestampSchema,
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  cancelShipment: z
    .object({
      storeId: identifierSchema,
      shipmentId: identifierSchema,
      expectedShipmentRevision: nonNegativeIntegerSchema,
      reason: z.string().trim().min(1).max(1_000).nullable(),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  getShipment: z
    .object({ storeId: identifierSchema, shipmentId: identifierSchema })
    .strict(),
  reconcileShipment: z
    .object({
      storeId: identifierSchema,
      shipmentId: identifierSchema,
      expectedShipmentRevision: nonNegativeIntegerSchema,
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  completeProviderOperation: CompleteDeliveryProviderOperationParamsSchema,
  reportProviderEvent: ReportDeliveryProviderEventParamsSchema,
} as const;

export function parseDeliveryProviderCompletionContext(
  context: BrokerCallContext,
): DeliveryProviderCompletionContext {
  if (
    context.caller.kind !== "action" ||
    context.caller.service !== "apps" ||
    !context.app ||
    context.app.executionKind === "COMMERCE_FUNCTION"
  ) {
    throw new Error("Invalid delivery provider callback context");
  }
  return Object.freeze({
    callerService: "apps",
    installationId: context.app.installationId,
    appCode: context.app.appCode,
    appVersion: context.app.appVersion,
    appOperationId: context.app.operationId ?? null,
    executionKind: "STANDARD",
    organizationId: context.app.organizationId,
    storeId: context.app.storeId,
    correlationId: context.app.correlationId ?? null,
    grantedScopes: context.app.grantedScopes,
  });
}

export function parseDeliveryProviderRateResult(
  value: unknown,
): Delivery.DeliveryProviderRateResult {
  return DeliveryProviderRateResultSchema.parse(
    value,
  ) as Delivery.DeliveryProviderRateResult;
}

export function parseDeliveryProviderRateExchange(
  request: Delivery.DeliveryProviderRateRequest,
  result: unknown,
): Delivery.DeliveryProviderRateResult {
  return DeliveryProviderRateExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryProviderRateResult;
}

export function parseDeliveryProviderShipmentOperationResult(
  value: unknown,
): Delivery.DeliveryProviderShipmentOperationResult {
  return DeliveryProviderShipmentOperationResultSchema.parse(
    value,
  ) as Delivery.DeliveryProviderShipmentOperationResult;
}

export function parseDeliveryProviderShipmentExchange(
  request:
    | Delivery.DeliveryProviderCreateShipmentRequest
    | Delivery.DeliveryProviderCancelShipmentRequest,
  result: unknown,
): Delivery.DeliveryProviderShipmentOperationResult {
  return DeliveryProviderShipmentExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryProviderShipmentOperationResult;
}

export function parseDeliveryProviderReconcileShipmentResult(
  value: unknown,
): Delivery.DeliveryProviderReconcileShipmentResult {
  return DeliveryProviderReconcileShipmentResultSchema.parse(
    value,
  ) as Delivery.DeliveryProviderReconcileShipmentResult;
}
