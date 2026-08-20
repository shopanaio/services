import {
  SegmentRegistry,
  type SegmentAttributeDescriptor,
  type SegmentFunctionDescriptor,
  type SegmentPredicateOperator,
} from "@shopana/customer-segment-dsl";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  normalizeEmailDomain,
  normalizePostalCodeValue,
  normalizePreferredLocale,
  normalizeUnicodeSearchValue,
  SEGMENT_NORMALIZATION_CONTRACTS,
} from "./normalization.js";

const EQUALITY = ["eq", "neq", "in", "not_in"] as const;
const NULLABLE_EQUALITY = [...EQUALITY, "is_null", "is_not_null"] as const;
const NUMERIC = ["eq", "neq", "gt", "gte", "lt", "lte", "between"] as const;
const DATE = [...NUMERIC] as const;
const NULLABLE_DATE = [...DATE, "is_null", "is_not_null"] as const;
const LIST = ["contains", "not_contains", "is_null", "is_not_null"] as const;
const BOOLEAN = ["eq", "neq"] as const;
const CONSENT_STATES = [
  "NOT_SUBSCRIBED",
  "PENDING",
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "INVALID",
  "REDACTED",
] as const;

const attributes: readonly SegmentAttributeDescriptor[] = [
  scalar("customer_added_date", "Date", DATE, ["profile"], ["customer_store_created_idx"], "VALUE"),
  scalar(
    "customer_updated_date",
    "Date",
    DATE,
    ["customer.any"],
    ["customer_store_updated_idx"],
    "VALUE",
  ),
  scalar(
    "last_activity_date",
    "Date",
    NULLABLE_DATE,
    ["profile"],
    ["customer_store_activity_idx"],
    "VALUE",
    { nullable: true },
  ),
  scalar(
    "customer_account_status",
    "Enum",
    EQUALITY,
    ["status"],
    ["customer_store_account_status_idx"],
    "NONE",
    {
      enumValues: ["GUEST", "INVITED", "REGISTERED"],
    },
  ),
  scalar(
    "customer_lifecycle_status",
    "Enum",
    EQUALITY,
    ["status"],
    ["customer_store_lifecycle_status_idx"],
    "NONE",
    {
      enumValues: ["ACTIVE", "DISABLED", "BLOCKED", "MERGED", "REDACTED"],
    },
  ),
  scalar(
    "customer_language",
    "String",
    NULLABLE_EQUALITY,
    ["profile"],
    ["customer_store_locale_idx"],
    "NONE",
    {
      nullable: true,
      normalizeString: normalizePreferredLocaleValue,
      normalizationContract: SEGMENT_NORMALIZATION_CONTRACTS.locale,
    },
  ),
  scalar(
    "customer_source",
    "String",
    EQUALITY,
    ["profile"],
    ["customer_store_source_idx"],
    "NONE",
    {
      normalizeString: normalizeSource,
      normalizationContract: SEGMENT_NORMALIZATION_CONTRACTS.source,
    },
  ),
  scalar(
    "customer_email_domain",
    "String",
    NULLABLE_EQUALITY,
    ["contact"],
    ["customer_store_email_domain_idx"],
    "NONE",
    {
      nullable: true,
      normalizeString: normalizeDomainValue,
      normalizationContract: SEGMENT_NORMALIZATION_CONTRACTS.emailDomain,
    },
  ),
  scalar(
    "email_verified",
    "Boolean",
    BOOLEAN,
    ["contact"],
    ["customer_store_email_verified_idx"],
    "NONE",
  ),
  scalar(
    "phone_verified",
    "Boolean",
    BOOLEAN,
    ["contact"],
    ["customer_store_phone_verified_idx"],
    "NONE",
  ),
  scalar(
    "company_name",
    "String",
    ["eq", "neq", "is_null", "is_not_null"],
    ["company"],
    ["customer_store_company_idx"],
    "NONE",
    {
      nullable: true,
      normalizeString: normalizeUnicodeSearchValue,
      normalizationContract: SEGMENT_NORMALIZATION_CONTRACTS.unicode,
    },
  ),
  scalar(
    "date_of_birth",
    "Date",
    NULLABLE_DATE,
    ["profile"],
    ["customer_store_birth_date_idx"],
    "VALUE",
    { nullable: true },
  ),

  list(
    "customer_countries",
    "String",
    ["address"],
    ["customer_address_store_country_customer_idx", "customer_address_store_customer_country_idx"],
    SEGMENT_NORMALIZATION_CONTRACTS.address,
    normalizeCountry,
  ),
  list(
    "customer_regions",
    "String",
    ["address"],
    ["customer_address_store_region_customer_idx", "customer_address_store_customer_region_idx"],
    SEGMENT_NORMALIZATION_CONTRACTS.address,
    normalizeRegion,
  ),
  list(
    "customer_cities",
    "String",
    ["address"],
    ["customer_address_store_city_customer_idx", "customer_address_store_customer_city_idx"],
    SEGMENT_NORMALIZATION_CONTRACTS.address,
    normalizeCity,
  ),
  list(
    "customer_postal_codes",
    "String",
    ["address"],
    ["customer_address_store_postal_customer_idx", "customer_address_store_customer_postal_idx"],
    SEGMENT_NORMALIZATION_CONTRACTS.address,
    normalizePostalCode,
  ),

  consent("email_subscription_status"),
  consent("sms_subscription_status"),
  consent("whatsapp_subscription_status"),
  consent("push_subscription_status"),

  listId(
    "customer_tags",
    GlobalIdEntity.CustomerTag,
    ["tag"],
    ["customer_tag_assignment_store_tag_idx", "customer_tag_assignment_store_customer_tag_idx"],
  ),
  {
    ...listId(
      "customer_groups",
      GlobalIdEntity.CustomerGroup,
      ["group"],
      [
        "customer_group_membership_store_group_expiry_idx",
        "customer_group_membership_store_customer_group_idx",
      ],
    ),
    temporalContract: "SOURCE",
  },

  statistics(
    "number_of_orders",
    "Integer",
    NUMERIC,
    "statistics.order",
    "customer_statistics_store_orders_count_idx",
    { nonNegative: true },
  ),
  statistics(
    "cancelled_orders_count",
    "Integer",
    NUMERIC,
    "statistics.order",
    "customer_statistics_store_cancelled_count_idx",
    { nonNegative: true },
  ),
  statistics(
    "returns_count",
    "Integer",
    NUMERIC,
    "statistics.refund",
    "customer_statistics_store_returns_count_idx",
    { nonNegative: true },
  ),
  statistics(
    "first_order_date",
    "Date",
    NULLABLE_DATE,
    "statistics.order",
    "customer_statistics_store_first_order_idx",
    { nullable: true, temporalContract: "VALUE" },
  ),
  statistics(
    "last_order_date",
    "Date",
    NULLABLE_DATE,
    "statistics.order",
    "customer_statistics_store_last_order_idx",
    { nullable: true, temporalContract: "VALUE" },
  ),
  statistics(
    "last_checkout_date",
    "Date",
    NULLABLE_DATE,
    "statistics.checkout",
    "customer_statistics_store_checkout_idx",
    { nullable: true, temporalContract: "VALUE" },
  ),
  statisticsMoney(
    "amount_spent",
    ["statistics.order", "statistics.refund"],
    "customer_monetary_statistics_store_spend_idx",
  ),
  statisticsMoney(
    "gross_amount_spent",
    ["statistics.order"],
    "customer_monetary_statistics_store_gross_idx",
  ),
  statisticsMoney(
    "amount_refunded",
    ["statistics.refund"],
    "customer_monetary_statistics_store_refunded_idx",
  ),
  statisticsMoney(
    "average_order_value",
    ["statistics.order"],
    "customer_monetary_statistics_store_average_idx",
  ),

  listEnum(
    "tax_identifier_statuses",
    ["UNVERIFIED", "VERIFIED", "REJECTED", "EXPIRED"],
    ["taxIdentifier"],
    [
      "customer_tax_identifier_store_status_validity_idx",
      "customer_tax_identifier_store_customer_idx",
    ],
  ),
  listEnum(
    "tax_exemption_statuses",
    ["ACTIVE", "EXPIRED", "REVOKED"],
    ["taxExemption"],
    [
      "customer_tax_exemption_store_status_validity_idx",
      "customer_tax_exemption_store_customer_idx",
    ],
  ),
  list(
    "tax_exemption_countries",
    "String",
    ["taxExemption"],
    [
      "customer_tax_exemption_store_country_validity_idx",
      "customer_tax_exemption_store_customer_country_validity_idx",
    ],
    "iso-3166-alpha2-v1",
    normalizeCountry,
    "SOURCE",
  ),

  {
    name: "birthday",
    presentationKey: "customerSegment.attribute.birthday",
    kind: "VIRTUAL",
    availability: "AVAILABLE",
    type: "Date",
    operators: ["eq", "neq", "between", "is_null", "is_not_null"],
    nullable: true,
    allowFutureDate: true,
    dependencies: ["profile"],
    normalizationContract: SEGMENT_NORMALIZATION_CONTRACTS.birthday,
    indexContract: ["customer_store_birthday_idx"],
    temporalContract: "VALUE",
    complexityCost: 2,
    sourceKind: "virtual",
  },
];

const functions: readonly SegmentFunctionDescriptor[] = [
  {
    name: "orders_placed",
    presentationKey: "customerSegment.function.ordersPlaced",
    kind: "FUNCTION",
    availability: "AVAILABLE",
    operators: ["matches", "not_matches", "is_null", "is_not_null"],
    dependencies: ["statistics.order"],
    normalizationContract: "customer-order-projection-v1",
    indexContract: [
      "customer_order_projection_customer_status_idx",
      "customer_order_projection_currency_amount_idx",
      "customer_order_projection_status_created_idx",
      "customer_order_projection_status_completed_idx",
      "customer_order_projection_status_cancelled_idx",
    ],
    temporalContract: "VALUE",
    complexityCost: 5,
    parameters: [
      parameter("status", "Enum", EQUALITY, false, {
        enumValues: ["OPEN", "COMPLETED", "CANCELLED"],
      }),
      parameter("created_date", "Date", DATE, false),
      parameter("completed_date", "Date", NULLABLE_DATE, false, { nullable: true }),
      parameter("cancelled_date", "Date", NULLABLE_DATE, false, { nullable: true }),
      parameter("amount", "Money", NUMERIC, false, { nonNegative: true }),
      parameter("count", "Integer", NUMERIC, true, { nonNegative: true }),
      parameter("sum_amount", "Money", NUMERIC, true, { nonNegative: true }),
    ],
  },
  {
    name: "products_purchased",
    presentationKey: "customerSegment.function.productsPurchased",
    kind: "FUNCTION",
    availability: "UNAVAILABLE",
    unavailabilityReason: "Purchase-line and Catalog identity projections are not ready",
    operators: ["matches", "not_matches", "is_null", "is_not_null"],
    dependencies: ["statistics.order"],
    normalizationContract: "customer-purchase-line-projection-v1",
    indexContract: ["customer_purchase_line_projection_not_available_v1"],
    temporalContract: "VALUE",
    complexityCost: 5,
    parameters: [
      parameter("product_id", "ID", EQUALITY, false, { entityType: GlobalIdEntity.Product }),
      parameter("variant_id", "ID", EQUALITY, false, { entityType: GlobalIdEntity.ProductVariant }),
      parameter("category_id", "ID", ["eq", "in"], false, { entityType: GlobalIdEntity.Category }),
      parameter("date", "Date", DATE, false),
      parameter("quantity", "Integer", NUMERIC, false, { nonNegative: true }),
      parameter("sum_quantity", "Integer", NUMERIC, true, { nonNegative: true }),
      parameter("count", "Integer", NUMERIC, true, { nonNegative: true }),
    ],
  },
];

export const CUSTOMER_SEGMENT_REGISTRY = new SegmentRegistry([...attributes, ...functions]);

function scalar(
  name: string,
  type: SegmentAttributeDescriptor["type"],
  operators: readonly SegmentPredicateOperator[],
  dependencies: SegmentAttributeDescriptor["dependencies"],
  indexes: readonly string[],
  temporalContract: SegmentAttributeDescriptor["temporalContract"],
  options: Partial<SegmentAttributeDescriptor> = {},
): SegmentAttributeDescriptor {
  return {
    name,
    presentationKey: `customerSegment.attribute.${name}`,
    kind: "SCALAR",
    availability: "AVAILABLE",
    type,
    operators,
    nullable: false,
    dependencies,
    normalizationContract: "identity-v1",
    indexContract: indexes,
    temporalContract,
    complexityCost: 1,
    sourceKind: "scalar",
    ...options,
  };
}

function list(
  name: string,
  type: SegmentAttributeDescriptor["type"],
  dependencies: SegmentAttributeDescriptor["dependencies"],
  indexes: readonly string[],
  normalizationContract: string,
  normalizeString?: (value: string) => string,
  temporalContract: SegmentAttributeDescriptor["temporalContract"] = "NONE",
): SegmentAttributeDescriptor {
  return {
    name,
    presentationKey: `customerSegment.attribute.${name}`,
    kind: "LIST",
    availability: "AVAILABLE",
    type,
    operators: LIST,
    nullable: true,
    dependencies,
    normalizationContract,
    indexContract: indexes,
    temporalContract,
    complexityCost: 2,
    sourceKind: "list",
    ...(normalizeString ? { normalizeString } : {}),
  };
}

function listId(
  name: string,
  entityType: string,
  dependencies: SegmentAttributeDescriptor["dependencies"],
  indexes: readonly string[],
): SegmentAttributeDescriptor {
  return { ...list(name, "ID", dependencies, indexes, "global-id-v1"), entityType };
}

function listEnum(
  name: string,
  enumValues: readonly string[],
  dependencies: SegmentAttributeDescriptor["dependencies"],
  indexes: readonly string[],
): SegmentAttributeDescriptor {
  return {
    ...list(name, "Enum", dependencies, indexes, "uppercase-enum-v1", undefined, "SOURCE"),
    enumValues,
  };
}

function consent(name: string): SegmentAttributeDescriptor {
  return scalar(
    name,
    "Enum",
    NULLABLE_EQUALITY,
    ["consent"],
    ["customer_consent_store_state_idx", "customer_consent_store_customer_channel_idx"],
    "NONE",
    {
      nullable: true,
      enumValues: CONSENT_STATES,
    },
  );
}

function statistics(
  name: string,
  type: SegmentAttributeDescriptor["type"],
  operators: readonly SegmentPredicateOperator[],
  dependency: SegmentAttributeDescriptor["dependencies"][number],
  indexName: string,
  options: Partial<SegmentAttributeDescriptor> = {},
): SegmentAttributeDescriptor {
  return scalar(
    name,
    type,
    operators,
    [dependency],
    [indexName],
    options.temporalContract ?? "NONE",
    {
      sourceKind: "statistics",
      ...options,
    },
  );
}

function statisticsMoney(
  name: string,
  dependencies: SegmentAttributeDescriptor["dependencies"],
  indexName: string,
): SegmentAttributeDescriptor {
  return scalar(name, "Money", NUMERIC, dependencies, [indexName], "NONE", {
    nonNegative: true,
    sourceKind: "statistics",
  });
}

function parameter(
  name: string,
  type: SegmentFunctionDescriptor["parameters"][number]["type"],
  operators: readonly SegmentPredicateOperator[],
  aggregate: boolean,
  options: Partial<SegmentFunctionDescriptor["parameters"][number]> = {},
): SegmentFunctionDescriptor["parameters"][number] {
  return {
    name,
    presentationKey: `customerSegment.parameter.${name}`,
    type,
    operators,
    nullable: false,
    aggregate,
    ...options,
  };
}

function normalizePreferredLocaleValue(value: string): string {
  const normalized = normalizePreferredLocale(value);
  if (!normalized) throw new Error("Locale cannot be empty");
  return normalized;
}

function normalizeSource(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(normalized)) {
    throw new Error("Customer source is invalid");
  }
  return normalized;
}

function normalizeDomainValue(value: string): string {
  const normalized = normalizeEmailDomain(`segment@${value}`);
  if (!normalized) throw new Error("Email domain is invalid");
  return normalized;
}

function normalizeCountry(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/u.test(normalized)) throw new Error("Country is invalid");
  return normalized;
}

function normalizeRegion(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}-[A-Z0-9]{1,3}$/u.test(normalized)) throw new Error("Region is invalid");
  return normalized;
}

function normalizeCity(value: string): string {
  const separator = value.indexOf("::");
  if (separator <= 0) throw new Error("City is invalid");
  const prefix = value.slice(0, separator).toUpperCase();
  if (!/^[A-Z]{2}(?:-[A-Z0-9]{1,3})?$/u.test(prefix)) throw new Error("City is invalid");
  const city = normalizeUnicodeSearchValue(value.slice(separator + 2));
  if (!city) throw new Error("City is invalid");
  return `${prefix}::${city}`;
}

function normalizePostalCode(value: string): string {
  const normalized = normalizePostalCodeValue(value);
  if (!normalized) throw new Error("Postal code is invalid");
  return normalized;
}
