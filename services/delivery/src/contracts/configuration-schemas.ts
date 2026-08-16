import type { Delivery } from "@shopana/broker-types";
import { z } from "zod";
import {
  DELIVERY_PROVIDER_MAX_COLLECTION_ITEMS,
  DeliveryProviderContactSchema,
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

const DeliveryDefaultProfileAssignmentSchema = z
    .object({
      scope: z.literal("ALL_UNASSIGNED"),
      assignmentSetId: z.null(),
      assignmentRevision: z.null(),
      variantCount: z.literal(0),
      sellingPlanGroupCount: z.literal(0),
    })
    .strict();

const DeliveryAssignedProfileAssignmentSchema = z
    .object({
      scope: z.literal("ASSIGNED"),
      assignmentSetId: identifierSchema,
      assignmentRevision: z.string().trim().min(1).max(512),
      variantCount: z.number().int().safe().nonnegative(),
      sellingPlanGroupCount: z.number().int().safe().nonnegative(),
    })
    .strict();

export const DeliveryProfileAssignmentSchema = z
  .discriminatedUnion("scope", [
    DeliveryDefaultProfileAssignmentSchema,
    DeliveryAssignedProfileAssignmentSchema,
  ])
  .superRefine((value, context) => {
  if (
    value.scope === "ASSIGNED" &&
    value.variantCount === 0 &&
    value.sellingPlanGroupCount === 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["variantCount"],
      message: "An assigned profile requires variants or selling plan groups",
    });
  }
  });

const normalizedPostalCodeSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9-]+$/);

export const DeliveryPostalCodeRuleSchema = z.discriminatedUnion("match", [
  z
    .object({
      effect: z.enum(["INCLUDE", "EXCLUDE"]),
      match: z.literal("EXACT"),
      value: normalizedPostalCodeSchema,
    })
    .strict(),
  z
    .object({
      effect: z.enum(["INCLUDE", "EXCLUDE"]),
      match: z.literal("PREFIX"),
      value: normalizedPostalCodeSchema,
    })
    .strict(),
  z
    .object({
      effect: z.enum(["INCLUDE", "EXCLUDE"]),
      match: z.literal("NUMERIC_RANGE"),
      start: z.string().regex(/^\d{1,16}$/),
      end: z.string().regex(/^\d{1,16}$/),
    })
    .strict(),
]).superRefine((value, context) => {
  if (
    value.match === "NUMERIC_RANGE" &&
    (value.start.length !== value.end.length ||
      BigInt(value.end) < BigInt(value.start))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end"],
      message: "Postal numeric range requires equal widths and start <= end",
    });
  }
});

export const DeliveryPostalCodeRuleSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    normalization: z.literal("UPPERCASE_REMOVE_ASCII_WHITESPACE"),
    rules: z.array(DeliveryPostalCodeRuleSchema).max(250),
  })
  .strict()
  .refine(
    (value) =>
      unique(
        value.rules.map((rule) =>
          rule.match === "NUMERIC_RANGE"
            ? `${rule.effect}:${rule.match}:${rule.start}:${rule.end}`
            : `${rule.effect}:${rule.match}:${rule.value}`,
        ),
      ),
    { path: ["rules"], message: "Postal code rules must be unique" },
  );

export const DeliveryZoneTerritorySchema = z
  .discriminatedUnion("scope", [
    z
      .object({
        scope: z.literal("COUNTRY"),
        countryCode: z.string().regex(/^[A-Z]{2}$/),
        provinceCodes: z.array(codeSchema).max(250),
        postalCodeRuleSet: DeliveryPostalCodeRuleSetSchema,
      })
      .strict(),
    z.object({ scope: z.literal("REST_OF_WORLD") }).strict(),
  ])
  .superRefine((value, context) => {
    if (value.scope === "COUNTRY" && !unique(value.provinceCodes)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provinceCodes"],
        message: "Province codes must be unique",
      });
    }
  });

export const DeliveryZoneSnapshotSchema = z
  .object({
    zoneId: identifierSchema,
    name: z.string().trim().min(1).max(255),
    priority: z.number().int().safe().nonnegative(),
    territories: z.array(DeliveryZoneTerritorySchema).max(249).nonempty(),
    revision: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const countryCodes = value.territories.flatMap((territory) =>
      territory.scope === "COUNTRY" ? [territory.countryCode] : [],
    );
    if (!unique(countryCodes)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["territories"],
        message: "A zone must contain at most one territory per country",
      });
    }
    if (
      value.territories.filter(({ scope }) => scope === "REST_OF_WORLD").length >
      1
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["territories"],
        message: "A zone may contain at most one rest-of-world territory",
      });
    }
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
        mode: z.literal("USE_BACKUP_RATE"),
        categories: z
          .array(z.enum(["PROVIDER_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED"]))
          .max(3)
          .nonempty(),
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (value.mode === "USE_BACKUP_RATE" && !unique(value.categories)) {
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
    deliveryMethodType: z.enum([
      "LOCAL",
      "NONE",
      "PICK_UP",
      "PICKUP_POINT",
      "RETAIL",
      "SHIPPING",
    ]),
    rateSource: z.discriminatedUnion("type", [
      z.object({ type: z.literal("MANUAL"), price: moneySchema }).strict(),
      z
        .object({
          type: z.literal("CARRIER_SERVICE"),
          carrierServiceAccountIds: z
            .array(identifierSchema)
            .max(250)
            .nonempty(),
          allowedServiceCodes: z.array(codeSchema).max(250),
          backupRate: moneySchema.nullable(),
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
      value.rateSource.type === "CARRIER_SERVICE" &&
      !unique(value.rateSource.carrierServiceAccountIds)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rateSource", "carrierServiceAccountIds"],
        message: "Carrier service account IDs must be unique",
      });
    }
    if (
      value.rateSource.type === "CARRIER_SERVICE" &&
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
    sender: DeliveryProviderContactSchema,
    fulfillmentLocationIds: z.array(identifierSchema).max(250).nonempty(),
    zones: z
      .array(
        z
          .object({
            zone: DeliveryZoneSnapshotSchema,
            methods: z.array(DeliveryMethodDefinitionSnapshotSchema).max(250),
          })
          .strict(),
      )
      .max(250)
      .nonempty(),
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
    const restOfWorldTerritories = value.zones.flatMap(({ zone }) =>
      zone.territories.filter(({ scope }) => scope === "REST_OF_WORLD"),
    );
    if (restOfWorldTerritories.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zones"],
        message: "A location group may define only one rest-of-world territory",
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

const deliveryProfileSnapshotBaseShape = {
  profileId: identifierSchema,
  organizationId: identifierSchema,
  storeId: identifierSchema,
  name: z.string().trim().min(1).max(255),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  locationGroups: z
    .array(DeliveryLocationGroupSnapshotSchema)
    .max(250)
    .nonempty(),
  failurePolicy: DeliveryRateFailurePolicySchema,
  revision: revisionSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

export const DeliveryProfileSnapshotSchema = z
  .union([
    z
      .object({
        ...deliveryProfileSnapshotBaseShape,
        isDefault: z.literal(true),
        assignment: DeliveryDefaultProfileAssignmentSchema,
      })
      .strict(),
    z
      .object({
        ...deliveryProfileSnapshotBaseShape,
        isDefault: z.literal(false),
        assignment: DeliveryAssignedProfileAssignmentSchema,
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (
      value.assignment.scope === "ASSIGNED" &&
      value.assignment.variantCount === 0 &&
      value.assignment.sellingPlanGroupCount === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignment", "variantCount"],
        message: "An assigned profile requires variants or selling plan groups",
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
    if (value.failurePolicy.mode === "USE_BACKUP_RATE") {
      value.locationGroups.forEach((locationGroup, locationGroupIndex) => {
        locationGroup.zones.forEach(({ methods }, zoneIndex) => {
          methods.forEach((method, methodIndex) => {
            if (
              method.active &&
              method.rateSource.type === "CARRIER_SERVICE" &&
              method.rateSource.backupRate === null
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
                  "backupRate",
                ],
                message: "Fallback policy requires a backup rate for every carrier method",
              });
            }
          });
        });
      });
    }
  });

type DeliveryProfileSnapshotValue = z.infer<
  typeof DeliveryProfileSnapshotSchema
>;

const DeliveryActiveProfileSnapshotSchema = DeliveryProfileSnapshotSchema.refine(
  (
    value,
  ): value is DeliveryProfileSnapshotValue & Readonly<{ status: "ACTIVE" }> =>
    value.status === "ACTIVE",
  {
    path: ["status"],
    message: "An active profile set cannot contain inactive profiles",
  },
);

export const DeliveryProfileSetSnapshotSchema = z
  .object({
    organizationId: identifierSchema,
    storeId: identifierSchema,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    assignmentResolution: z.literal(
      "SELLING_PLAN_THEN_VARIANT_THEN_DEFAULT",
    ),
    revision: z.string().trim().min(1).max(512),
    profiles: z.array(DeliveryActiveProfileSnapshotSchema).max(250).nonempty(),
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
    const assignmentSetIds = value.profiles.flatMap(({ assignment }) =>
      assignment.scope === "ASSIGNED" ? [assignment.assignmentSetId] : [],
    );
    if (!unique(assignmentSetIds)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profiles"],
        message: "Every assigned profile requires its own assignment set",
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
      const fulfillmentLocationIds = profile.locationGroups.flatMap(
        ({ fulfillmentLocationIds }) => fulfillmentLocationIds,
      );
      if (!unique(fulfillmentLocationIds)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["profiles", index, "locationGroups"],
          message: "A fulfillment location may belong to only one group per profile",
        });
      }
      profile.locationGroups.forEach((locationGroup, locationGroupIndex) => {
        locationGroup.zones.forEach(({ methods }, zoneIndex) => {
          methods.forEach((method, methodIndex) => {
            const money = [
              ...(method.rateSource.type === "MANUAL"
                ? [method.rateSource.price]
                : method.rateSource.backupRate === null
                  ? []
                  : [method.rateSource.backupRate]),
              ...method.conditions.conditions.flatMap((condition) =>
                condition.type === "CART_SUBTOTAL" ? [condition.amount] : [],
              ),
            ];
            if (money.some(({ currencyCode }) => currencyCode !== value.currencyCode)) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: [
                  "profiles",
                  index,
                  "locationGroups",
                  locationGroupIndex,
                  "zones",
                  zoneIndex,
                  "methods",
                  methodIndex,
                ],
                message: "Every delivery amount must use the profile-set currency",
              });
            }
          });
        });
      });
    });
  });

export const DeliveryEligibilitySnapshotSchema = z
  .object({
    eligibilityRevision: z.string().trim().min(1).max(512),
    organizationId: identifierSchema,
    storeId: identifierSchema,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    profileSetRevision: z.string().trim().min(1).max(512),
    profileId: identifierSchema,
    profileRevision: revisionSchema,
    assignmentMatch: z.discriminatedUnion("matchedBy", [
      z
        .object({
          matchedBy: z.literal("DEFAULT"),
          assignmentSetId: z.null(),
          assignmentRevision: z.null(),
        })
        .strict(),
      z
        .object({
          matchedBy: z.enum(["SELLING_PLAN", "VARIANT"]),
          assignmentSetId: identifierSchema,
          assignmentRevision: z.string().trim().min(1).max(512),
        })
        .strict(),
    ]),
    locationGroupId: identifierSchema,
    locationGroupRevision: revisionSchema,
    zoneId: identifierSchema,
    zoneRevision: revisionSchema,
    methodDefinitions: z.array(DeliveryMethodDefinitionSnapshotSchema).max(250),
    failurePolicy: DeliveryRateFailurePolicySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !unique(
        value.methodDefinitions.map(
          ({ methodDefinitionId }) => methodDefinitionId,
        ),
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["methodDefinitions"],
        message: "Eligible method definition IDs must be unique",
      });
    }
    value.methodDefinitions.forEach((method, index) => {
      const money = [
        ...(method.rateSource.type === "MANUAL"
          ? [method.rateSource.price]
          : method.rateSource.backupRate === null
            ? []
            : [method.rateSource.backupRate]),
        ...method.conditions.conditions.flatMap((condition) =>
          condition.type === "CART_SUBTOTAL" ? [condition.amount] : [],
        ),
      ];
      if (
        money.some(({ currencyCode }) => currencyCode !== value.currencyCode)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["methodDefinitions", index],
          message: "Eligible delivery amounts must use the eligibility currency",
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
  return DeliveryProfileSnapshotSchema.parse(value);
}

export function parseDeliveryProfileSetSnapshot(
  value: unknown,
): Delivery.DeliveryProfileSetSnapshot {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery profile set snapshot",
    DELIVERY_CONFIGURATION_MAX_PAYLOAD_BYTES,
  );
  return DeliveryProfileSetSnapshotSchema.parse(value);
}

export function parseDeliveryEligibilitySnapshot(
  value: unknown,
): Delivery.DeliveryEligibilitySnapshot {
  assertDeliveryContractPayloadSize(
    value,
    "Delivery eligibility snapshot",
    DELIVERY_CONFIGURATION_MAX_PAYLOAD_BYTES,
  );
  return DeliveryEligibilitySnapshotSchema.parse(
    value,
  ) as Delivery.DeliveryEligibilitySnapshot;
}
