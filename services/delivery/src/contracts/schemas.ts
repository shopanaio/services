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
const positiveIntegerSchema = z.number().int().safe().positive();
const nonNegativeIntegerSchema = z.number().int().safe().nonnegative();
const httpsUrlSchema = z
  .string()
  .url()
  .max(4_096)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Provider asset URLs must use HTTPS",
  })
  .refine(
    (value) => {
      const url = new URL(value);
      return url.username === "" && url.password === "" && url.hash === "";
    },
    {
      message: "Provider asset URLs cannot contain credentials or fragments",
    }
  );

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

function validateCustomerInputSchemaReferences(
  schema: unknown,
  context: z.RefinementCtx,
): void {
  const visit = (entry: unknown, path: (string | number)[]): void => {
    if (Array.isArray(entry)) {
      entry.forEach((child, index) => visit(child, [...path, index]));
      return;
    }
    if (entry === null || typeof entry !== "object") return;
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
  visit(schema, []);
}

const customerInputContractBaseShape = {
  schemaDialect: z.literal("https://json-schema.org/draft/2020-12/schema"),
  schema: jsonObjectSchema,
};

export const DeliveryProviderCustomerInputContractSchema = z
  .object({
    ...customerInputContractBaseShape,
  })
  .strict()
  .superRefine((value, context) => {
    validateCustomerInputSchemaReferences(value.schema, context);
  });

export const DeliveryCustomerInputContractSchema = z
  .object({
    ...customerInputContractBaseShape,
    schemaHash: revisionSchema,
    schemaPolicyRevision: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateCustomerInputSchemaReferences(value.schema, context);
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

export const DeliveryCarrierServiceCapabilitiesSchema = z
  .object({
    supportsServiceDiscovery: z.boolean(),
  })
  .strict();

export const DeliveryShipmentProviderCapabilitiesSchema = z
  .object({
    supportsLabels: z.boolean(),
    supportsMultipleParcels: z.boolean(),
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
    unitDeclaredValue: DeliveryProviderMoneySchema,
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
      (sum, item) =>
        sum + BigInt(item.weightGrams) * BigInt(item.quantity),
      0n,
    );
    if (BigInt(value.weightGrams) < itemWeight) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightGrams"],
        message: "Package weight must cover the total item weight",
      });
    }
    const currencies = new Set([
      value.declaredValue.currencyCode,
      ...value.items.map((item) => item.unitDeclaredValue.currencyCode),
    ]);
    if (currencies.size !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["declaredValue", "currencyCode"],
        message: "Package and item declared values must use one currency",
      });
    }
    const itemDeclaredValue = value.items.reduce(
      (sum, item) =>
        sum + BigInt(item.unitDeclaredValue.amountMinor) * BigInt(item.quantity),
      0n,
    );
    if (BigInt(value.declaredValue.amountMinor) !== itemDeclaredValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["declaredValue", "amountMinor"],
        message: "Package declared value must equal the extended item value",
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
  DeliveryProviderOperations.validateCarrierServiceConfiguration,
  DeliveryProviderOperations.validateShipmentConfiguration,
  DeliveryProviderOperations.quoteRates,
  DeliveryProviderOperations.resolveCustomerInput,
  DeliveryProviderOperations.searchCustomerInputOptions,
  DeliveryProviderOperations.createShipment,
  DeliveryProviderOperations.cancelShipment,
  DeliveryProviderOperations.getShipment,
  DeliveryProviderOperations.reconcileShipment,
]);

const providerRouteBaseShape = {
  protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
  capabilityRouteId: identifierSchema,
  installationId: identifierSchema,
  appCode: codeSchema,
  appVersion: identifierSchema,
  routeRevision: revisionSchema,
};

export const DeliveryCarrierServiceRouteSnapshotSchema = z
  .object({
    ...providerRouteBaseShape,
    capability: z.literal("delivery.carrier-service"),
    operation: z.enum([
      "validateCarrierServiceConfiguration",
      "quoteRates",
      "resolveCustomerInput",
      "searchCustomerInputOptions",
    ]),
  })
  .strict();

export const DeliveryShipmentProviderRouteSnapshotSchema = z
  .object({
    ...providerRouteBaseShape,
    capability: z.literal("delivery.shipment-provider"),
    operation: z.enum([
      "validateShipmentConfiguration",
      "createShipment",
      "cancelShipment",
      "getShipment",
      "reconcileShipment",
    ]),
  })
  .strict();

export const DeliveryProviderRouteSnapshotSchema = z.discriminatedUnion(
  "capability",
  [
    DeliveryCarrierServiceRouteSnapshotSchema,
    DeliveryShipmentProviderRouteSnapshotSchema,
  ],
);

const deliveryOptionBindingBaseShape = {
  optionHandle: identifierSchema,
  checkoutId: identifierSchema,
  basedOnCheckoutVersion: nonNegativeIntegerSchema,
  targetCheckoutVersion: positiveIntegerSchema,
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
        source: z.literal("CARRIER_SERVICE"),
        carrierServiceAccountId: identifierSchema,
        carrierCode: codeSchema,
        serviceCode: codeSchema,
        quoteRoute: DeliveryCarrierServiceRouteSnapshotSchema.extend({
          operation: z.literal("quoteRates"),
        }),
        carrierServiceConfigurationRevision: revisionSchema,
        executionPolicyRevision: revisionSchema,
        customerInputSchemaPolicyRevision: revisionSchema,
        publicDataPolicyRevision: revisionSchema,
        quoteRevision: revisionSchema,
      })
      .strict(),
    z
      .object({
        ...deliveryOptionBindingBaseShape,
        source: z.literal("MANUAL"),
        manualRateRevision: nonNegativeIntegerSchema,
      })
      .strict(),
  ],
).superRefine((value, context) => {
  if (value.targetCheckoutVersion !== value.basedOnCheckoutVersion + 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetCheckoutVersion"], message: "Binding target checkout version must follow its base version" });
  }
  if (
    value.source === "CARRIER_SERVICE" &&
    value.customerInputContract !== null &&
    value.customerInputContract.schemaPolicyRevision !==
      value.customerInputSchemaPolicyRevision
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerInputContract", "schemaPolicyRevision"],
      message: "Customer input contract must use the binding policy revision",
    });
  }
});

export const DeliveryProviderConfigurationValidationRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    capability: z.enum([
      "delivery.carrier-service",
      "delivery.shipment-provider",
    ]),
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    mode: z.enum(["TEST", "LIVE"]),
  })
  .strict();

const providerConfigurationValidationResultBaseShape = {
  status: z.enum(["READY", "DEGRADED", "INVALID"]),
  providerCode: codeSchema,
  displayName: z.string().trim().min(1).max(255),
  supportedCountryCodes: z.array(countryCodeSchema).max(249),
  supportedCurrencyCodes: z.array(currencyCodeSchema).max(256),
  supportedOperations: z.array(providerOperationSchema).min(1),
  failure: DeliveryProviderFailureSchema.nullable(),
  configurationRevision: revisionSchema,
};

export const DeliveryProviderConfigurationValidationResultSchema =
  z.discriminatedUnion("capability", [
    z
      .object({
        ...providerConfigurationValidationResultBaseShape,
        capability: z.literal("delivery.carrier-service"),
        capabilities: DeliveryCarrierServiceCapabilitiesSchema,
      })
      .strict(),
    z
      .object({
        ...providerConfigurationValidationResultBaseShape,
        capability: z.literal("delivery.shipment-provider"),
        capabilities: DeliveryShipmentProviderCapabilitiesSchema,
      })
      .strict(),
  ])
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
    const rateOperations = new Set([
      "validateCarrierServiceConfiguration",
      "quoteRates",
      "resolveCustomerInput",
      "searchCustomerInputOptions",
    ]);
    const required =
      value.capability === "delivery.carrier-service"
        ? (["validateCarrierServiceConfiguration", "quoteRates", "resolveCustomerInput"] as const)
        : (["validateShipmentConfiguration", "createShipment"] as const);
    for (const operation of required) {
      if (!supported.has(operation)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supportedOperations"],
          message: `Delivery capability must support ${operation}`,
        });
      }
    }
    for (const operation of supported) {
      const belongsToCapability =
        value.capability === "delivery.carrier-service"
          ? rateOperations.has(operation)
          : !rateOperations.has(operation);
      if (!belongsToCapability) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supportedOperations"],
          message: `${operation} does not belong to ${value.capability}`,
        });
      }
    }
    if (
      value.capability === "delivery.shipment-provider" &&
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
      value.capability === "delivery.shipment-provider" &&
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

export const DeliveryProviderConfigurationValidationExchangeSchema = z
  .object({
    request: DeliveryProviderConfigurationValidationRequestSchema,
    result: DeliveryProviderConfigurationValidationResultSchema,
  })
  .strict()
  .refine((value) => value.request.capability === value.result.capability, {
    path: ["result", "capability"],
    message: "Configuration result capability must match its request",
  });

export const DeliveryCarrierServiceRateRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    quoteRequestId: identifierSchema,
    executionId: identifierSchema,
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    effectiveAt: timestampSchema,
    storeId: identifierSchema,
    checkoutId: identifierSchema,
    basedOnCheckoutVersion: nonNegativeIntegerSchema,
    targetCheckoutVersion: positiveIntegerSchema,
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
    if (value.targetCheckoutVersion !== value.basedOnCheckoutVersion + 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetCheckoutVersion"], message: "Target checkout version must follow the base version" });
    }
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

export const DeliveryCarrierServiceRateSchema = z
  .object({
    serviceCode: codeSchema,
    serviceName: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(2_000),
    cost: DeliveryProviderMoneySchema,
    estimatedMinDeliveryAt: nullableTimestampSchema,
    estimatedMaxDeliveryAt: nullableTimestampSchema,
    phoneRequired: z.boolean(),
    customerInputContract: DeliveryProviderCustomerInputContractSchema.nullable(),
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

export const DeliveryProviderResolveCustomerInputRequestSchema = z
  .object({
    protocolVersion: z.literal(DELIVERY_PROVIDER_PROTOCOL_VERSION),
    correlationId: correlationIdSchema,
    deadlineAt: timestampSchema,
    effectiveAt: timestampSchema,
    storeId: identifierSchema,
    providerAccountId: identifierSchema,
    serviceCode: codeSchema,
    customerInputContractHash: revisionSchema,
    value: jsonObjectSchema.nullable(),
  })
  .strict();

export const DeliveryProviderResolveCustomerInputResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("VALID"),
      normalized: jsonObjectSchema.nullable(),
      valueHash: revisionSchema,
      semanticRevision: revisionSchema,
      publicData: jsonObjectSchema,
    }).strict(),
    z.object({
      status: z.literal("INVALID"),
      issues: z.array(z.object({
        path: z.string().max(512),
        code: codeSchema,
        message: z.string().trim().min(1).max(2_000),
      }).strict()).max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    }).strict(),
  ],
);

export const DeliveryProviderSearchCustomerInputOptionsRequestSchema =
  DeliveryProviderResolveCustomerInputRequestSchema.omit({ value: true }).extend({
    query: z.string().trim().max(255),
    cursor: z.string().trim().min(1).max(512).nullable(),
    limit: positiveIntegerSchema.max(100),
  }).strict();

export const DeliveryProviderSearchCustomerInputOptionsResultSchema = z.object({
  options: z.array(z.object({
    value: jsonObjectSchema,
    label: z.string().trim().min(1).max(255),
    publicData: jsonObjectSchema,
  }).strict()).max(100),
  nextCursor: z.string().trim().min(1).max(512).nullable(),
  revision: revisionSchema,
}).strict();

export const DeliveryCarrierServiceRateResultSchema = z
  .object({
    quoteRequestId: identifierSchema,
    revision: revisionSchema,
    rates: z
      .array(DeliveryCarrierServiceRateSchema)
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
  })
  .strict()
  .superRefine((value, context) => {
    const serviceCodes = value.rates.map((rate) => rate.serviceCode);
    addUniqueValueIssue(
      serviceCodes,
      context,
      ["rates"],
      "Carrier service codes must be unique within one result",
    );
  });

/** Request/result pair validator for the untrusted provider boundary. */
export const DeliveryCarrierServiceRateExchangeSchema = z
  .object({
    request: DeliveryCarrierServiceRateRequestSchema,
    result: DeliveryCarrierServiceRateResultSchema,
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
          message: "Carrier rate currency must match the request currency",
        });
      }
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
    mediaId: identifierSchema,
    assetPolicyRevision: revisionSchema,
    expiresAt: nullableTimestampSchema,
  })
  .strict();

export const DeliveryTrackingEventSnapshotSchema = z
  .object({
    providerEventId: identifierSchema,
    providerShipmentSequence: z.string().max(64).regex(/^(0|[1-9]\d*)$/).nullable(),
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
    providerShipmentSequence: z
      .string()
      .max(64)
      .regex(/^(0|[1-9]\d*)$/)
      .nullable(),
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
    packageIds: z
      .array(identifierSchema)
      .max(DELIVERY_PROVIDER_MAX_PACKAGES)
      .nonempty(),
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
    fulfillmentOrderReference: identifierSchema,
    shipmentConfigurationRevision: revisionSchema,
    shipmentPlanHash: revisionSchema,
    deliveryMethodCommitmentId: identifierSchema,
    ratedFactsHash: revisionSchema,
    deliveryMethodCode: codeSchema,
    selectedRate: z.discriminatedUnion("source", [
      z
        .object({
          source: z.literal("MANUAL"),
          serviceCode: codeSchema,
        })
        .strict(),
      z
        .object({
          source: z.literal("CARRIER_SERVICE"),
          carrierCode: codeSchema,
          serviceCode: codeSchema,
        })
        .strict(),
    ]),
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
    providerEventId: identifierSchema,
    providerShipmentSequence: z
      .string()
      .max(64)
      .regex(/^(0|[1-9]\d*)$/)
      .nullable(),
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
      value.providerShipmentSequence !==
        value.event.event.providerShipmentSequence
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerShipmentSequence"],
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
      enabledCapabilities: z
        .array(
          z.enum([
            "delivery.carrier-service",
            "delivery.shipment-provider",
          ]),
        )
        .min(1)
        .max(2)
        .refine((value) => new Set(value).size === value.length, {
          message: "Enabled delivery capabilities must be unique",
        }),
      mode: z.enum(["TEST", "LIVE"]),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  setProviderCapabilityStatus: z
    .object({
      storeId: identifierSchema,
      providerAccountId: identifierSchema,
      expectedAccountRevision: nonNegativeIntegerSchema,
      capability: z.enum([
        "delivery.carrier-service",
        "delivery.shipment-provider",
      ]),
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
  createShipment: z
    .object({
      storeId: identifierSchema,
      fulfillmentOrderId: identifierSchema,
      expectedFulfillmentOrderRevision: nonNegativeIntegerSchema,
      lineItems: z
        .array(
          z
            .object({
              fulfillmentOrderLineItemId: identifierSchema,
              quantity: positiveIntegerSchema,
            })
            .strict(),
        )
        .min(1)
        .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS)
        .nullable(),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict()
    .refine(
      (value) =>
        value.lineItems === null ||
        new Set(
          value.lineItems.map(
            ({ fulfillmentOrderLineItemId }) => fulfillmentOrderLineItemId,
          ),
        ).size === value.lineItems.length,
      {
        path: ["lineItems"],
        message: "Requested fulfillment order line IDs must be unique",
      },
    ),
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

export function parseDeliveryCarrierServiceRateResult(
  value: unknown,
): Delivery.DeliveryCarrierServiceRateResult {
  assertDeliveryContractPayloadSize(value, "Delivery carrier rate result");
  return DeliveryCarrierServiceRateResultSchema.parse(
    value,
  ) as Delivery.DeliveryCarrierServiceRateResult;
}

export function parseDeliveryProviderConfigurationValidationResult(
  request: Delivery.DeliveryProviderConfigurationValidationRequest,
  value: unknown,
): Delivery.DeliveryProviderConfigurationValidationResult {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery provider configuration validation result",
  );
  return DeliveryProviderConfigurationValidationExchangeSchema.parse({
    request,
    result: value,
  }).result as Delivery.DeliveryProviderConfigurationValidationResult;
}

export function parseDeliveryCarrierServiceRateExchange(
  request: Delivery.DeliveryCarrierServiceRateRequest,
  result: unknown,
): Delivery.DeliveryCarrierServiceRateResult {
  assertDeliveryContractPayloadSize(result, "Delivery carrier rate result");
  return DeliveryCarrierServiceRateExchangeSchema.parse({ request, result })
    .result as Delivery.DeliveryCarrierServiceRateResult;
}

export function parseDeliveryProviderResolveCustomerInputResult(
  value: unknown,
): Delivery.DeliveryProviderResolveCustomerInputResult {
  assertDeliveryContractPayloadSize(value, "Delivery provider customer input result");
  return DeliveryProviderResolveCustomerInputResultSchema.parse(value) as Delivery.DeliveryProviderResolveCustomerInputResult;
}

export function parseDeliveryProviderSearchCustomerInputOptionsResult(
  value: unknown,
): Delivery.DeliveryProviderSearchCustomerInputOptionsResult {
  assertDeliveryContractPayloadSize(value, "Delivery provider customer input options result");
  return DeliveryProviderSearchCustomerInputOptionsResultSchema.parse(value) as Delivery.DeliveryProviderSearchCustomerInputOptionsResult;
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
  return DeliveryProviderReconcileShipmentResultSchema.parse(value);
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
