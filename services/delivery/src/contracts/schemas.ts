import {
  DELIVERY_PROVIDER_PROTOCOL_VERSION,
  DeliveryActions,
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
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const httpsUrlSchema = z
  .string()
  .url()
  .max(4_096)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Provider asset URLs must use HTTPS",
  });

export const DELIVERY_PROVIDER_MAX_PAYLOAD_BYTES = 1_048_576;
export const DELIVERY_PROVIDER_MAX_JSON_DEPTH = 16;
export const DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS = 250;
export const DELIVERY_PROVIDER_MAX_PACKAGES = 250;
export const DELIVERY_PROVIDER_MAX_ITEMS_PER_PACKAGE = 250;
export const DELIVERY_PROVIDER_MAX_TRACKING_EVENTS = 1_000;

function createProviderJsonValueSchema(
  remainingDepth: number,
): z.ZodTypeAny {
  const primitiveSchema = z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string().max(65_536),
  ]);
  if (remainingDepth === 0) {
    return primitiveSchema;
  }
  const childSchema = createProviderJsonValueSchema(remainingDepth - 1);
  return z.union([
    primitiveSchema,
    z.array(childSchema).max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    z.record(childSchema).superRefine((value, context) => {
      if (Object.keys(value).length > DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provider JSON object has too many properties",
        });
      }
    }),
  ]);
}

const providerJsonValueSchema = createProviderJsonValueSchema(
  DELIVERY_PROVIDER_MAX_JSON_DEPTH,
);
export const DeliveryProviderJsonObjectSchema = z
  .record(providerJsonValueSchema)
  .superRefine((value, context) => {
    if (Object.keys(value).length > DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider JSON object has too many properties",
      });
    }
  });
const jsonObjectSchema = DeliveryProviderJsonObjectSchema;

function addUniqueValueIssue(
  values: readonly string[],
  context: z.RefinementCtx,
  path: (string | number)[],
  message: string,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message,
    });
  }
}

export function assertDeliveryContractPayloadSize(
  value: unknown,
  label: string,
  maxBytes = DELIVERY_PROVIDER_MAX_PAYLOAD_BYTES,
): void {
  let serialized: string;
  try {
    const result = JSON.stringify(value);
    if (result === undefined) {
      throw new Error("not JSON serializable");
    }
    serialized = result;
  } catch {
    throw new Error(`${label} must be serializable JSON`);
  }
  if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
    throw new Error(`${label} exceeds the payload size limit`);
  }
}

export const DeliveryCustomerInputContractSchema = z
  .object({
    schemaDialect: z.literal(
      "https://json-schema.org/draft/2020-12/schema",
    ),
    schema: jsonObjectSchema,
    schemaHash: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const visit = (entry: unknown, path: (string | number)[]): void => {
      if (Array.isArray(entry)) {
        entry.forEach((child, index) => visit(child, [...path, index]));
        return;
      }
      if (entry === null || typeof entry !== "object") {
        return;
      }
      Object.entries(entry).forEach(([key, child]) => {
        if (
          (key === "$ref" || key === "$dynamicRef") &&
          typeof child === "string" &&
          !child.startsWith("#")
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schema", ...path, key],
            message: "Customer input schemas may use only local references",
          });
        }
        visit(child, [...path, key]);
      });
    };
    visit(value.schema, []);
  });

export const DeliveryProviderMoneySchema = z
  .object({
    amountMinor: z.string().max(128).regex(/^(0|[1-9]\d*)$/),
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
    items: z
      .array(DeliveryProviderPackageItemSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_ITEMS_PER_PACKAGE),
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
  customizationPolicyRevision: revisionSchema,
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
        executionPolicyRevision: revisionSchema,
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
      ((value.status === "INVALID" || value.status === "DEGRADED") &&
        value.failure === null) ||
      (value.status === "READY" && value.failure !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "DEGRADED and INVALID require a failure; READY forbids one",
      });
    }
    addUniqueValueIssue(
      value.supportedOperations,
      context,
      ["supportedOperations"],
      "Supported provider operations must be unique",
    );
    addUniqueValueIssue(
      value.supportedCountryCodes,
      context,
      ["supportedCountryCodes"],
      "Supported country codes must be unique",
    );
    addUniqueValueIssue(
      value.supportedCurrencyCodes,
      context,
      ["supportedCurrencyCodes"],
      "Supported currency codes must be unique",
    );
    const supported = new Set(value.supportedOperations);
    for (const required of [
      "validateConfiguration",
      "quoteRates",
      "createShipment",
    ] as const) {
      if (!supported.has(required)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supportedOperations"],
          message: `Delivery provider must support ${required}`,
        });
      }
    }
    if (
      value.capabilities.supportsPickupLocations &&
      (!supported.has("searchLocations") || !supported.has("resolveLocation"))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capabilities", "supportsPickupLocations"],
        message: "Pickup locations require search and resolve operations",
      });
    }
    if (
      value.capabilities.supportsCancellation !==
      supported.has("cancelShipment")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capabilities", "supportsCancellation"],
        message: "Cancellation capability must match the declared operation",
      });
    }
    if (
      value.capabilities.supportsReconciliation !==
      supported.has("reconcileShipment")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capabilities", "supportsReconciliation"],
        message: "Reconciliation capability must match the declared operation",
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
    minimumQuoteExpiresAt: timestampSchema,
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
    packages: z
      .array(DeliveryProviderPackageSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_PACKAGES),
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
      Date.parse(value.minimumQuoteExpiresAt) <= Date.parse(value.deadlineAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimumQuoteExpiresAt"],
        message: "minimumQuoteExpiresAt must be after the provider deadline",
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
    addUniqueValueIssue(
      value.packages.map(({ packageId }) => packageId),
      context,
      ["packages"],
      "Package IDs must be unique within one rate request",
    );
    if (
      value.origin.address.countryCode !== value.destination.address.countryCode &&
      value.packages.some(({ customs }) => customs === null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["packages"],
        message: "International rate requests require customs declarations",
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
    rates: z
      .array(DeliveryProviderRateDefinitionSchema)
      .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    warnings: z
      .array(
        z
          .object({
            code: codeSchema,
            message: z.string().trim().min(1).max(2_000),
          })
          .strict(),
      )
      .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
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
    addUniqueValueIssue(
      serviceCodes,
      context,
      ["rates"],
      "Provider service codes must be unique within one result",
    );
    addUniqueValueIssue(
      value.rates.map(({ quoteToken }) => quoteToken),
      context,
      ["rates"],
      "Provider quote tokens must be unique within one result",
    );
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
      if (
        Date.parse(rate.expiresAt) <
        Date.parse(value.request.minimumQuoteExpiresAt)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["result", "rates", index, "expiresAt"],
          message: "Provider rate does not satisfy the minimum quote lifetime",
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
    minimumTokenExpiresAt: timestampSchema,
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
  .strict()
  .refine(
    (value) =>
      Date.parse(value.minimumTokenExpiresAt) > Date.parse(value.deadlineAt),
    {
      path: ["minimumTokenExpiresAt"],
      message: "minimumTokenExpiresAt must be after the provider deadline",
    },
  );

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
  .strict()
  .superRefine((value, context) => {
    if (value.failure !== null && value.locations.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "A failed location search cannot contain locations",
      });
    }
    if (
      value.failure !== null &&
      (value.pageInfo.hasNextPage || value.pageInfo.endCursor !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pageInfo", "hasNextPage"],
        message: "A failed location search cannot advertise another page",
      });
    }
    if (value.pageInfo.hasNextPage && value.pageInfo.endCursor === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pageInfo", "endCursor"],
        message: "A next page and its cursor must be present together",
      });
    }
    addUniqueValueIssue(
      value.locations.map(({ providerLocationId }) => providerLocationId),
      context,
      ["locations"],
      "Provider location IDs must be unique within one page",
    );
    addUniqueValueIssue(
      value.locations.map(({ locationToken }) => locationToken),
      context,
      ["locations"],
      "Provider location tokens must be unique within one page",
    );
  });

export const DeliveryProviderLocationResolveRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    requestId: identifierSchema,
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    minimumTokenExpiresAt: timestampSchema,
    localeCode: z.string().trim().min(1).max(64).nullable(),
    locationToken: identifierSchema,
  })
  .strict()
  .refine(
    (value) =>
      Date.parse(value.minimumTokenExpiresAt) > Date.parse(value.deadlineAt),
    {
      path: ["minimumTokenExpiresAt"],
      message: "minimumTokenExpiresAt must be after the provider deadline",
    },
  );

export const DeliveryProviderLocationResolveResultSchema = z
  .object({
    requestId: identifierSchema,
    location: DeliveryProviderPickupLocationSchema.nullable(),
    failure: DeliveryProviderFailureSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => value.failure === null || value.location === null,
    {
      path: ["failure"],
      message: "A failed location resolution cannot contain a location",
    },
  );

export const DeliveryProviderLocationSearchExchangeSchema = z
  .object({
    request: DeliveryProviderLocationSearchRequestSchema,
    result: DeliveryProviderLocationSearchResultSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.request.requestId !== value.result.requestId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result", "requestId"],
        message: "Provider result does not belong to this location search request",
      });
    }
    value.result.locations.forEach((location, index) => {
      if (
        location.tokenExpiresAt !== null &&
        Date.parse(location.tokenExpiresAt) <
          Date.parse(value.request.minimumTokenExpiresAt)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["result", "locations", index, "tokenExpiresAt"],
          message: "Pickup location token does not satisfy the minimum lifetime",
        });
      }
    });
  });

export const DeliveryProviderLocationResolveExchangeSchema = z
  .object({
    request: DeliveryProviderLocationResolveRequestSchema,
    result: DeliveryProviderLocationResolveResultSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.request.requestId !== value.result.requestId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result", "requestId"],
        message: "Provider result does not belong to this location resolve request",
      });
    }
    if (
      value.result.location?.tokenExpiresAt !== null &&
      value.result.location?.tokenExpiresAt !== undefined &&
      Date.parse(value.result.location.tokenExpiresAt) <
        Date.parse(value.request.minimumTokenExpiresAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result", "location", "tokenExpiresAt"],
        message: "Resolved pickup token does not satisfy the minimum lifetime",
      });
    }
  });

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

const providerObservedShipmentStates = [
  "PENDING",
  "ACCEPTED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNING",
  "RETURNED",
  "CANCELLED",
] as const;
const providerObservedShipmentStateSchema = z.enum(
  providerObservedShipmentStates,
);

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
    providerSequence: z.string().max(64).regex(/^(0|[1-9]\d*)$/).nullable(),
    parcelId: identifierSchema.nullable(),
    providerParcelReference: identifierSchema.nullable(),
    statusCode: codeSchema,
    state: providerObservedShipmentStateSchema,
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
    packageIds: z
      .array(identifierSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_PACKAGES),
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

export const DeliveryProviderLabelSchema = z
  .object({
    format: z.enum(["PDF", "PNG", "ZPL"]),
    downloadUrl: httpsUrlSchema,
    expiresAt: nullableTimestampSchema,
  })
  .strict();

export const DeliveryProviderTrackingEventSchema = z
  .object({
    providerEventId: identifierSchema,
    providerSequence: z.string().max(64).regex(/^(0|[1-9]\d*)$/).nullable(),
    providerParcelReference: identifierSchema.nullable(),
    statusCode: codeSchema,
    state: providerObservedShipmentStateSchema,
    message: z.string().trim().min(1).max(2_000).nullable(),
    location: DeliveryProviderLocationAddressSchema.nullable(),
    occurredAt: timestampSchema,
  })
  .strict();

export const DeliveryProviderParcelObservationSchema = z
  .object({
    providerParcelReference: identifierSchema,
    packageIds: z.array(identifierSchema).min(1).max(DELIVERY_PROVIDER_MAX_PACKAGES),
    state: providerObservedShipmentStateSchema,
    tracking: z.array(DeliveryTrackingSnapshotSchema).max(100),
    labels: z.array(DeliveryProviderLabelSchema).max(100),
    estimatedDeliveryAt: nullableTimestampSchema,
    deliveredAt: nullableTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    addUniqueValueIssue(
      value.packageIds,
      context,
      ["packageIds"],
      "Provider parcel package IDs must be unique",
    );
    addUniqueValueIssue(
      value.tracking.map(({ number }) => number),
      context,
      ["tracking"],
      "Provider parcel tracking numbers must be unique",
    );
    if (value.state === "DELIVERED" && value.deliveredAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveredAt"],
        message: "A delivered provider parcel requires deliveredAt",
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
    packages: z
      .array(DeliveryProviderPackageSchema)
      .min(1)
      .max(DELIVERY_PROVIDER_MAX_PACKAGES),
    customerInput: jsonObjectSchema.nullable(),
    customerInputHash: revisionSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.customerInput === null) !== (value.customerInputHash === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerInputHash"],
        message: "customerInput and customerInputHash must be present together",
      });
    }
    addUniqueValueIssue(
      value.packages.map(({ packageId }) => packageId),
      context,
      ["packages"],
      "Package IDs must be unique within one shipment request",
    );
    if (
      value.origin.address.countryCode !== value.destination.address.countryCode &&
      value.packages.some(({ customs }) => customs === null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["packages"],
        message: "International shipments require customs declarations",
      });
    }
  });

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

const providerSucceededOperationShape = {
  providerShipmentReference: identifierSchema,
  parcels: z
    .array(DeliveryProviderParcelObservationSchema)
    .max(DELIVERY_PROVIDER_MAX_PACKAGES),
  events: z
    .array(DeliveryProviderTrackingEventSchema)
    .max(DELIVERY_PROVIDER_MAX_TRACKING_EVENTS),
  processedAt: timestampSchema,
  metadata: jsonObjectSchema.nullable(),
};

const providerPendingOperationShape = {
  providerShipmentReference: identifierSchema,
  nextReconcileAt: nullableTimestampSchema,
  observedAt: timestampSchema,
  metadata: jsonObjectSchema.nullable(),
};

const providerFailedOperationShape = {
  failure: DeliveryProviderFailureSchema,
  failedAt: timestampSchema,
  metadata: jsonObjectSchema.nullable(),
};

export const DeliveryProviderShipmentOperationResultSchema = z.union([
  z
    .object({
      operation: z.literal("CREATE"),
      status: z.literal("SUCCEEDED"),
      ...providerSucceededOperationShape,
      parcels: z
        .array(DeliveryProviderParcelObservationSchema)
        .min(1)
        .max(DELIVERY_PROVIDER_MAX_PACKAGES),
      shipmentState: providerObservedShipmentStateSchema,
    })
    .strict(),
  z
    .object({
      operation: z.literal("CREATE"),
      status: z.literal("PENDING"),
      ...providerPendingOperationShape,
      shipmentState: z.literal("PENDING"),
    })
    .strict(),
  z
    .object({
      operation: z.literal("CREATE"),
      status: z.literal("FAILED"),
      ...providerFailedOperationShape,
      providerShipmentReference: identifierSchema.nullable(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("CANCEL"),
      status: z.literal("SUCCEEDED"),
      ...providerSucceededOperationShape,
      shipmentState: z.literal("CANCELLED"),
    })
    .strict(),
  z
    .object({
      operation: z.literal("CANCEL"),
      status: z.literal("PENDING"),
      ...providerPendingOperationShape,
      shipmentState: z.literal("CANCELLING"),
    })
    .strict(),
  z
    .object({
      operation: z.literal("CANCEL"),
      status: z.literal("FAILED"),
      ...providerFailedOperationShape,
      providerShipmentReference: identifierSchema,
    })
    .strict(),
]).superRefine((value, context) => {
  if (value.status !== "SUCCEEDED") {
    return;
  }
  addUniqueValueIssue(
    value.parcels.map(({ providerParcelReference }) => providerParcelReference),
    context,
    ["parcels"],
    "Provider parcel references must be unique",
  );
  addUniqueValueIssue(
    value.events.map(({ providerEventId }) => providerEventId),
    context,
    ["events"],
    "Provider tracking event IDs must be unique",
  );
  const providerParcelReferences = new Set(
    value.parcels.map(({ providerParcelReference }) => providerParcelReference),
  );
  value.parcels.forEach((parcel, parcelIndex) => {
    parcel.labels.forEach((label, labelIndex) => {
      if (
        label.expiresAt !== null &&
        Date.parse(label.expiresAt) <= Date.parse(value.processedAt)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parcels", parcelIndex, "labels", labelIndex, "expiresAt"],
          message: "Provider label is already expired at processing time",
        });
      }
    });
  });
  value.events.forEach((event, index) => {
    if (
      event.providerParcelReference !== null &&
      !providerParcelReferences.has(event.providerParcelReference)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["events", index, "providerParcelReference"],
        message: "Tracking event references an unknown parcel",
      });
    }
  });
});

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
    shipmentState: providerObservedShipmentStateSchema,
    parcels: z
      .array(DeliveryProviderParcelObservationSchema)
      .max(DELIVERY_PROVIDER_MAX_PACKAGES),
    events: z
      .array(DeliveryProviderTrackingEventSchema)
      .max(DELIVERY_PROVIDER_MAX_TRACKING_EVENTS),
    observedAt: timestampSchema,
    metadata: jsonObjectSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    addUniqueValueIssue(
      value.parcels.map(({ providerParcelReference }) => providerParcelReference),
      context,
      ["parcels"],
      "Provider parcel references must be unique",
    );
    addUniqueValueIssue(
      value.events.map(({ providerEventId }) => providerEventId),
      context,
      ["events"],
      "Provider tracking event IDs must be unique",
    );
    const providerParcelReferences = new Set(
      value.parcels.map(({ providerParcelReference }) => providerParcelReference),
    );
    value.parcels.forEach((parcel, parcelIndex) => {
      parcel.labels.forEach((label, labelIndex) => {
        if (
          label.expiresAt !== null &&
          Date.parse(label.expiresAt) <= Date.parse(value.observedAt)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["parcels", parcelIndex, "labels", labelIndex, "expiresAt"],
            message: "Provider label is already expired at observation time",
          });
        }
      });
    });
    value.events.forEach((event, index) => {
      if (
        event.providerParcelReference !== null &&
        !providerParcelReferences.has(event.providerParcelReference)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["events", index, "providerParcelReference"],
          message: "Tracking event references an unknown parcel",
        });
      }
    });
  });

export const DeliveryProviderExternalEventSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("SHIPMENT_STATUS_CHANGED"),
        providerShipmentReference: identifierSchema,
        shipmentState: providerObservedShipmentStateSchema,
        parcel: DeliveryProviderParcelObservationSchema.nullable(),
        event: DeliveryProviderTrackingEventSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        type: z.literal("SHIPMENT_LABEL_AVAILABLE"),
        providerShipmentReference: identifierSchema,
        providerParcelReference: identifierSchema,
        label: DeliveryProviderLabelSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (value.type !== "SHIPMENT_STATUS_CHANGED") {
      return;
    }
    if (
      value.event.providerParcelReference === null &&
      value.shipmentState !== value.event.state
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event", "state"],
        message: "Tracking event state must match the shipment observation",
      });
    }
    if (value.parcel !== null && value.parcel.state !== value.event.state) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event", "state"],
        message: "Tracking event state must match the parcel observation",
      });
    }
    if (
      value.parcel !== null &&
      value.event.providerParcelReference !== value.parcel.providerParcelReference
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event", "providerParcelReference"],
        message: "Tracking event must reference the supplied parcel",
      });
    }
  });

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
    const resultOccurredAt =
      value.result.status === "RECONCILED"
        ? value.result.observedAt
        : value.result.status === "SUCCEEDED"
          ? value.result.processedAt
          : value.result.status === "PENDING"
            ? value.result.observedAt
            : value.result.failedAt;
    if (resultOccurredAt !== value.occurredAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occurredAt"],
        message: "Completion timestamp must match the provider result timestamp",
      });
    }
  });

export const ReportDeliveryProviderEventParamsSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    providerAccountId: identifierSchema,
    providerEventId: identifierSchema,
    providerSequence: z.string().max(64).regex(/^(0|[1-9]\d*)$/).nullable(),
    occurredAt: timestampSchema,
    event: DeliveryProviderExternalEventSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.event.type === "SHIPMENT_STATUS_CHANGED" &&
      value.occurredAt !== value.event.event.occurredAt
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occurredAt"],
        message: "Callback timestamp must match the tracking event timestamp",
      });
    }
    if (
      value.event.type === "SHIPMENT_STATUS_CHANGED" &&
      value.providerEventId !== value.event.event.providerEventId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerEventId"],
        message: "Callback event ID must match the tracking event ID",
      });
    }
    if (
      value.event.type === "SHIPMENT_STATUS_CHANGED" &&
      value.providerSequence !== value.event.event.providerSequence
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerSequence"],
        message: "Callback sequence must match the tracking event sequence",
      });
    }
    if (
      value.event.type === "SHIPMENT_LABEL_AVAILABLE" &&
      value.event.label.expiresAt !== null &&
      Date.parse(value.event.label.expiresAt) <= Date.parse(value.occurredAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event", "label", "expiresAt"],
        message: "Provider label is already expired at callback time",
      });
    }
  });

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
  requiredPermission:
    | typeof DeliveryActions.completeProviderOperation
    | typeof DeliveryActions.reportProviderEvent,
): DeliveryProviderCompletionContext {
  if (
    context.caller.kind !== "action" ||
    context.caller.service !== "apps" ||
    !context.app ||
    context.app.executionKind === "COMMERCE_FUNCTION"
  ) {
    throw new Error("Invalid delivery provider callback context");
  }
  if (!context.app.grantedScopes.includes(requiredPermission)) {
    throw new Error("Delivery provider callback permission was not granted");
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
  assertDeliveryContractPayloadSize(value, "Delivery provider rate result");
  return DeliveryProviderRateResultSchema.parse(
    value,
  ) as Delivery.DeliveryProviderRateResult;
}

export function parseDeliveryProviderConfigurationValidationResult(
  value: unknown,
): Delivery.DeliveryProviderConfigurationValidationResult {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery provider configuration validation result",
  );
  return DeliveryProviderConfigurationValidationResultSchema.parse(
    value,
  ) as Delivery.DeliveryProviderConfigurationValidationResult;
}

export function parseDeliveryProviderRateExchange(
  request: Delivery.DeliveryProviderRateRequest,
  result: unknown,
): Delivery.DeliveryProviderRateResult {
  assertDeliveryContractPayloadSize(result, "Delivery provider rate result");
  return DeliveryProviderRateExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryProviderRateResult;
}

export function parseDeliveryProviderShipmentOperationResult(
  value: unknown,
): Delivery.DeliveryProviderShipmentOperationResult {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery provider shipment operation result",
  );
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
  assertDeliveryContractPayloadSize(
    result,
    "Delivery provider shipment operation result",
  );
  return DeliveryProviderShipmentExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryProviderShipmentOperationResult;
}

export function parseDeliveryProviderReconcileShipmentResult(
  value: unknown,
): Delivery.DeliveryProviderReconcileShipmentResult {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery provider reconcile result",
  );
  return DeliveryProviderReconcileShipmentResultSchema.parse(
    value,
  ) as Delivery.DeliveryProviderReconcileShipmentResult;
}

export function parseCompleteDeliveryProviderOperationParams(
  value: unknown,
): Delivery.CompleteDeliveryProviderOperationParams {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery provider operation completion",
  );
  return CompleteDeliveryProviderOperationParamsSchema.parse(
    value,
  ) as Delivery.CompleteDeliveryProviderOperationParams;
}

export function parseReportDeliveryProviderEventParams(
  value: unknown,
): Delivery.ReportDeliveryProviderEventParams {
  assertDeliveryContractPayloadSize(value, "Delivery provider event");
  return ReportDeliveryProviderEventParamsSchema.parse(
    value,
  ) as Delivery.ReportDeliveryProviderEventParams;
}

export function parseDeliveryProviderLocationSearchExchange(
  request: Delivery.DeliveryProviderLocationSearchRequest,
  result: unknown,
): Delivery.DeliveryProviderLocationSearchResult {
  assertDeliveryContractPayloadSize(
    result,
    "Delivery provider location search result",
  );
  return DeliveryProviderLocationSearchExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryProviderLocationSearchResult;
}

export function parseDeliveryProviderLocationResolveExchange(
  request: Delivery.DeliveryProviderLocationResolveRequest,
  result: unknown,
): Delivery.DeliveryProviderLocationResolveResult {
  assertDeliveryContractPayloadSize(
    result,
    "Delivery provider location resolve result",
  );
  return DeliveryProviderLocationResolveExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryProviderLocationResolveResult;
}
