import type { Delivery } from "@shopana/broker-types";
import { z } from "zod";
import {
  DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS,
  DeliveryProviderJsonObjectSchema,
  assertDeliveryContractPayloadSize,
} from "./schemas.js";

const DELIVERY_CONFIGURATION_MAX_PAYLOAD_BYTES = 4_194_304;

const identifierSchema = z.string().trim().min(1).max(512);
const codeSchema = z.string().trim().min(1).max(128);
const revisionSchema = z.number().int().safe().nonnegative();
const timestampSchema = z.string().datetime({ offset: true });
const moneySchema = z
  .object({
    amountMinor: z.string().max(128).regex(/^(0|[1-9]\d*)$/),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const DeliveryProfileAssignmentSchema = z.discriminatedUnion("scope", [
  z
    .object({
      scope: z.literal("ALL_UNASSIGNED"),
      variantIds: z.tuple([]),
      sellingPlanGroupIds: z
        .array(identifierSchema)
        .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    })
    .strict(),
  z
    .object({
      scope: z.literal("VARIANTS"),
      variantIds: z
        .array(identifierSchema)
        .min(1)
        .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
      sellingPlanGroupIds: z
        .array(identifierSchema)
        .max(DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS),
    })
    .strict(),
]).superRefine((value, context) => {
  if (!unique(value.variantIds)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["variantIds"],
      message: "Assigned variant IDs must be unique",
    });
  }
  if (!unique(value.sellingPlanGroupIds)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sellingPlanGroupIds"],
      message: "Selling plan group IDs must be unique",
    });
  }
});

export const DeliveryZoneTerritorySchema = z
  .object({
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    provinceCodes: z.array(codeSchema).max(250),
    postalCodePatterns: z.array(z.string().trim().min(1).max(128)).max(250),
  })
  .strict()
  .superRefine((value, context) => {
    if (!unique(value.provinceCodes)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provinceCodes"],
        message: "Province codes must be unique",
      });
    }
    if (!unique(value.postalCodePatterns)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postalCodePatterns"],
        message: "Postal code patterns must be unique",
      });
    }
  });

export const DeliveryZoneSnapshotSchema = z
  .object({
    zoneId: identifierSchema,
    name: z.string().trim().min(1).max(255),
    priority: z.number().int().safe().nonnegative(),
    territories: z.array(DeliveryZoneTerritorySchema).min(1).max(249),
    revision: revisionSchema,
  })
  .strict()
  .refine((value) => unique(value.territories.map(({ countryCode }) => countryCode)), {
    path: ["territories"],
    message: "A zone must contain at most one territory per country",
  });

export const DeliveryRateConditionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("CART_SUBTOTAL"),
      operator: z.enum(["GTE", "LTE"]),
      amount: moneySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("PACKAGE_WEIGHT_GRAMS"),
      operator: z.enum(["GTE", "LTE"]),
      value: z.number().int().safe().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal("PACKAGE_ITEM_COUNT"),
      operator: z.enum(["GTE", "LTE"]),
      value: z.number().int().safe().nonnegative(),
    })
    .strict(),
  z.object({ type: z.literal("CHANNEL"), values: z.array(codeSchema).min(1).max(250) }).strict(),
  z
    .object({
      type: z.literal("CUSTOMER_SEGMENT"),
      values: z.array(identifierSchema).min(1).max(250),
    })
    .strict(),
  z
    .object({
      type: z.literal("PURCHASE_TYPE"),
      values: z.array(z.enum(["ONE_TIME", "SUBSCRIPTION", "PRE_ORDER"])).min(1).max(3),
    })
    .strict(),
]).superRefine((value, context) => {
  if ("values" in value && !unique(value.values)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["values"],
      message: "Condition values must be unique",
    });
  }
});

export const DeliveryRateFailurePolicySchema = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("OMIT_PROVIDER_RATES") }).strict(),
    z.object({ mode: z.literal("FAIL_GROUP") }).strict(),
    z
      .object({
        mode: z.literal("USE_METHOD_FALLBACK"),
        categories: z
          .array(z.enum(["PROVIDER_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED"]))
          .min(1)
          .max(3),
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (value.mode === "USE_METHOD_FALLBACK" && !unique(value.categories)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categories"],
        message: "Fallback failure categories must be unique",
      });
    }
  });

export const DeliveryMethodDefinitionSnapshotSchema = z
  .object({
    methodDefinitionId: identifierSchema,
    code: codeSchema,
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(2_000).nullable(),
    active: z.boolean(),
    deliveryMethodType: z.enum(["PICKUP", "SHIPPING"]),
    shippingPaymentModel: z.enum(["MERCHANT_COLLECTED", "CARRIER_DIRECT"]),
    rateSource: z.discriminatedUnion("type", [
      z.object({ type: z.literal("STATIC"), price: moneySchema }).strict(),
      z
        .object({
          type: z.literal("PROVIDER"),
          providerAccountIds: z.array(identifierSchema).min(1).max(250),
          allowedServiceCodes: z.array(codeSchema).max(250),
          fallbackRate: moneySchema.nullable(),
        })
        .strict(),
    ]),
    conditions: z
      .object({
        match: z.enum(["ALL", "ANY"]),
        conditions: z.array(DeliveryRateConditionSchema).max(250),
      })
      .strict(),
    metadata: DeliveryProviderJsonObjectSchema.nullable(),
    revision: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.shippingPaymentModel === "CARRIER_DIRECT" &&
      value.rateSource.type !== "PROVIDER"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shippingPaymentModel"],
        message: "Carrier-direct payment requires a provider-backed method",
      });
    }
    if (
      value.rateSource.type === "PROVIDER" &&
      !unique(value.rateSource.providerAccountIds)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rateSource", "providerAccountIds"],
        message: "Provider account IDs must be unique",
      });
    }
    if (
      value.rateSource.type === "PROVIDER" &&
      !unique(value.rateSource.allowedServiceCodes)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rateSource", "allowedServiceCodes"],
        message: "Allowed provider service codes must be unique",
      });
    }
  });

export const DeliveryLocationGroupSnapshotSchema = z
  .object({
    locationGroupId: identifierSchema,
    name: z.string().trim().min(1).max(255),
    fulfillmentLocationIds: z.array(identifierSchema).min(1).max(250),
    zones: z
      .array(
        z
          .object({
            zone: DeliveryZoneSnapshotSchema,
            methods: z.array(DeliveryMethodDefinitionSnapshotSchema).max(250),
          })
          .strict(),
      )
      .min(1)
      .max(250),
    revision: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (!unique(value.fulfillmentLocationIds)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillmentLocationIds"],
        message: "Fulfillment location IDs must be unique",
      });
    }
    if (!unique(value.zones.map(({ zone }) => zone.zoneId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zones"],
        message: "Zone IDs must be unique within a location group",
      });
    }
    const zonePriorities = value.zones.map(({ zone }) => String(zone.priority));
    if (!unique(zonePriorities)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zones"],
        message: "Zone priorities must be unique within a location group",
      });
    }
    value.zones.forEach(({ methods }, index) => {
      if (!unique(methods.map(({ methodDefinitionId }) => methodDefinitionId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["zones", index, "methods"],
          message: "Method definition IDs must be unique within a zone",
        });
      }
      if (!unique(methods.map(({ code }) => code))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["zones", index, "methods"],
          message: "Delivery method codes must be unique within a zone",
        });
      }
    });
  });

export const DeliveryProfileSnapshotSchema = z
  .object({
    profileId: identifierSchema,
    organizationId: identifierSchema,
    storeId: identifierSchema,
    name: z.string().trim().min(1).max(255),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    isDefault: z.boolean(),
    priority: z.number().int().safe(),
    assignment: DeliveryProfileAssignmentSchema,
    locationGroups: z.array(DeliveryLocationGroupSnapshotSchema).min(1).max(250),
    failurePolicy: DeliveryRateFailurePolicySchema,
    revision: revisionSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.isDefault !== (value.assignment.scope === "ALL_UNASSIGNED")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignment", "scope"],
        message: "Only the default profile may cover all unassigned variants",
      });
    }
    if (!unique(value.locationGroups.map(({ locationGroupId }) => locationGroupId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationGroups"],
        message: "Location group IDs must be unique within a profile",
      });
    }
    if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updatedAt"],
        message: "updatedAt cannot precede createdAt",
      });
    }
    if (value.failurePolicy.mode === "USE_METHOD_FALLBACK") {
      value.locationGroups.forEach((locationGroup, locationGroupIndex) => {
        locationGroup.zones.forEach(({ methods }, zoneIndex) => {
          methods.forEach((method, methodIndex) => {
            if (
              method.rateSource.type === "PROVIDER" &&
              method.rateSource.fallbackRate === null
            ) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: [
                  "locationGroups",
                  locationGroupIndex,
                  "zones",
                  zoneIndex,
                  "methods",
                  methodIndex,
                  "rateSource",
                  "fallbackRate",
                ],
                message: "Fallback policy requires a fallback rate for every provider method",
              });
            }
          });
        });
      });
    }
  });

export const DeliveryProfileSetSnapshotSchema = z
  .object({
    organizationId: identifierSchema,
    storeId: identifierSchema,
    revision: z.string().trim().min(1).max(512),
    profiles: z.array(DeliveryProfileSnapshotSchema).min(1).max(250),
  })
  .strict()
  .superRefine((value, context) => {
    if (!unique(value.profiles.map(({ profileId }) => profileId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profiles"],
        message: "Profile IDs must be unique within a store configuration",
      });
    }
    if (value.profiles.filter(({ isDefault }) => isDefault).length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profiles"],
        message: "An active delivery configuration requires exactly one default profile",
      });
    }
    const assignedVariants = value.profiles.flatMap(({ assignment }) =>
      assignment.scope === "VARIANTS" ? assignment.variantIds : [],
    );
    if (!unique(assignedVariants)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profiles"],
        message: "A variant cannot be assigned to multiple delivery profiles",
      });
    }
    value.profiles.forEach((profile, index) => {
      if (
        profile.organizationId !== value.organizationId ||
        profile.storeId !== value.storeId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["profiles", index],
          message: "Every profile must belong to the profile set tenant",
        });
      }
      if (profile.status !== "ACTIVE") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["profiles", index, "status"],
          message: "An active profile set cannot contain inactive profiles",
        });
      }
    });
  });

export function parseDeliveryProfileSnapshot(
  value: unknown,
): Delivery.DeliveryProfileSnapshot {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery profile snapshot",
    DELIVERY_CONFIGURATION_MAX_PAYLOAD_BYTES,
  );
  return DeliveryProfileSnapshotSchema.parse(
    value,
  ) as Delivery.DeliveryProfileSnapshot;
}

export function parseDeliveryProfileSetSnapshot(
  value: unknown,
): Delivery.DeliveryProfileSetSnapshot {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery profile set snapshot",
    DELIVERY_CONFIGURATION_MAX_PAYLOAD_BYTES,
  );
  return DeliveryProfileSetSnapshotSchema.parse(
    value,
  ) as Delivery.DeliveryProfileSetSnapshot;
}
