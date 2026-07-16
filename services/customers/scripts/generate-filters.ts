import { mkdirSync, writeFileSync } from "fs";
import {
  generateBaseFilterTypes,
  generateGraphQLTypes,
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { customerAddressRelayQuery } from "../src/repositories/address/CustomerAddressRepository.js";
import {
  customerGroupMembershipRelayQuery,
  customerGroupRelayQuery,
} from "../src/repositories/classification/CustomerGroupRepository.js";
import {
  customerSegmentMembershipRelayQuery,
  customerSegmentRelayQuery,
} from "../src/repositories/classification/CustomerSegmentRepository.js";
import {
  customerTagAssignmentRelayQuery,
  customerTagRelayQuery,
} from "../src/repositories/classification/CustomerTagRepository.js";
import { customerConsentEventRelayQuery } from "../src/repositories/consent/CustomerConsentRepository.js";
import { customerRelayQuery } from "../src/repositories/customer/CustomerRepository.js";
import {
  customerDataRequestRelayQuery,
  customerMergeRelayQuery,
} from "../src/repositories/lifecycle/CustomerLifecycleRepository.js";
import { customerMonetaryStatisticsRelayQuery } from "../src/repositories/statistics/CustomerStatisticsRepository.js";
import { customerTaxExemptionRelayQuery } from "../src/repositories/tax/CustomerTaxExemptionRepository.js";
import { customerTaxIdentifierRelayQuery } from "../src/repositories/tax/CustomerTaxIdentifierRepository.js";

const outputDirectory = "src/api/graphql-admin/schema/__generated__";

function excludedFields(
  allFields: readonly string[],
  includedFields: readonly string[]
): string[] {
  const included = new Set(includedFields);
  return allFields.filter((field) => !included.has(field));
}

function overrideFilterType(
  source: string,
  field: string,
  filterType: string
): string {
  return source.replace(
    new RegExp(`(\\n\\s+${field}: )\\w+Filter`),
    `$1${filterType}`
  );
}

function appendWhereField(
  source: string,
  field: string,
  filterType: string,
  description: string
): string {
  return source.replace(
    /\n}$/,
    `\n  """${description}"""\n  ${field}: ${filterType}\n}`
  );
}

function generateWhere<TQuery extends Parameters<typeof generateGraphQLTypes>[0]>(
  query: TQuery,
  name: string,
  fields: readonly string[],
  fieldTypes: Record<string, GraphQLFieldType> = {},
  filterTypes: Record<string, string> = {}
): string {
  const allFields = generateGraphQLTypes(query, name, {
    includeBaseTypes: false,
  }).fields;
  let result = generateWhereInputType(query, name, {
    includeDescriptions: true,
    excludeFields: excludedFields(allFields, fields),
    fieldTypes,
  });

  for (const [field, filterType] of Object.entries(filterTypes)) {
    result = overrideFilterType(result, field, filterType);
  }

  return result;
}

function generateOrder<TQuery extends Parameters<typeof generateGraphQLTypes>[0]>(
  query: TQuery,
  name: string,
  fields: readonly string[]
): string {
  const allFields = generateGraphQLTypes(query, name, {
    includeBaseTypes: false,
  }).fields;
  return generateOrderByInputType(query, name, {
    includeDescriptions: true,
    excludeFields: excludedFields(allFields, fields),
  });
}

const customerWhereFields = [
  "id",
  "lifecycleStatus",
  "accountStatus",
  "iamPrincipalId",
  "displayName",
  "email",
  "phoneE164",
  "firstName",
  "lastName",
  "companyName",
  "preferredLocale",
  "source",
  "dateOfBirth",
  "emailVerified",
  "phoneVerified",
  "defaultShippingCity",
  "defaultShippingRegionCode",
  "defaultShippingCountryCode",
  "emailMarketingState",
  "ordersCount",
  "totalSpentMinor",
  "lastOrderAt",
  "lastActivityAt",
  "createdAt",
  "updatedAt",
] as const;
const customerOrderFields = [
  "id",
  "displayName",
  "lifecycleStatus",
  "accountStatus",
  "email",
  "phoneE164",
  "firstName",
  "lastName",
  "companyName",
  "dateOfBirth",
  "ordersCount",
  "totalSpentMinor",
  "lastOrderAt",
  "lastActivityAt",
  "createdAt",
  "updatedAt",
] as const;

let customerWhere = generateWhere(
  customerRelayQuery,
  "Customer",
  customerWhereFields,
  {
    id: "ID",
    emailVerified: "Boolean",
    phoneVerified: "Boolean",
    dateOfBirth: "DateTime",
    ordersCount: "Int",
    lastOrderAt: "DateTime",
    lastActivityAt: "DateTime",
    createdAt: "DateTime",
    updatedAt: "DateTime",
  },
  {
    lifecycleStatus: "CustomerLifecycleStatusFilter",
    accountStatus: "CustomerAccountStatusFilter",
    dateOfBirth: "DateFilter",
    emailMarketingState: "CustomerConsentStateFilter",
    totalSpentMinor: "BigIntFilter",
  }
);
customerWhere = appendWhereField(
  customerWhere,
  "segmentId",
  "IDFilter",
  "Match customers with a current membership in the selected segment IDs."
);
const customerOrder = generateOrder(
  customerRelayQuery,
  "Customer",
  customerOrderFields
);

const addressWhereFields = [
  "id",
  "label",
  "firstName",
  "lastName",
  "companyName",
  "phoneE164",
  "city",
  "regionCode",
  "postalCode",
  "countryCode",
  "isDefaultShipping",
  "isDefaultBilling",
  "validationStatus",
  "createdAt",
  "updatedAt",
] as const;
const addressOrderFields = [
  "id",
  "label",
  "firstName",
  "lastName",
  "city",
  "regionCode",
  "postalCode",
  "countryCode",
  "isDefaultShipping",
  "isDefaultBilling",
  "validationStatus",
  "createdAt",
  "updatedAt",
] as const;
const addressWhere = generateWhere(
  customerAddressRelayQuery,
  "CustomerAddress",
  addressWhereFields,
  { id: "ID" },
  { validationStatus: "CustomerAddressValidationStatusFilter" }
);
const addressOrder = generateOrder(
  customerAddressRelayQuery,
  "CustomerAddress",
  addressOrderFields
);

const taxIdentifierWhereFields = [
  "id",
  "identifierType",
  "countryCode",
  "value",
  "status",
  "isPrimary",
  "validFrom",
  "validTo",
  "createdAt",
  "updatedAt",
] as const;
const taxIdentifierOrderFields = [
  "id",
  "identifierType",
  "countryCode",
  "status",
  "isPrimary",
  "validFrom",
  "validTo",
  "createdAt",
  "updatedAt",
] as const;
const taxIdentifierWhere = generateWhere(
  customerTaxIdentifierRelayQuery,
  "CustomerTaxIdentifier",
  taxIdentifierWhereFields,
  { id: "ID" },
  {
    status: "CustomerTaxIdentifierStatusFilter",
    validFrom: "DateFilter",
    validTo: "DateFilter",
  }
);
const taxIdentifierOrder = generateOrder(
  customerTaxIdentifierRelayQuery,
  "CustomerTaxIdentifier",
  taxIdentifierOrderFields
);

const taxExemptionFields = [
  "id",
  "code",
  "countryCode",
  "regionCode",
  "status",
  "validFrom",
  "validTo",
  "createdAt",
  "updatedAt",
] as const;
const taxExemptionWhere = generateWhere(
  customerTaxExemptionRelayQuery,
  "CustomerTaxExemption",
  taxExemptionFields,
  { id: "ID" },
  {
    status: "CustomerTaxExemptionStatusFilter",
    validFrom: "DateFilter",
    validTo: "DateFilter",
  }
);
const taxExemptionOrder = generateOrder(
  customerTaxExemptionRelayQuery,
  "CustomerTaxExemption",
  taxExemptionFields
);

const consentEventOrder = generateOrder(
  customerConsentEventRelayQuery,
  "CustomerConsentEvent",
  ["id", "channel", "newState", "source", "actorType", "occurredAt"]
);

const groupFields = [
  "id",
  "code",
  "name",
  "isDefault",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;
const groupWhere = generateWhere(
  customerGroupRelayQuery,
  "CustomerGroup",
  groupFields,
  { id: "ID" }
);
const groupOrder = generateOrder(
  customerGroupRelayQuery,
  "CustomerGroup",
  groupFields
);

const groupMembershipWhereFields = [
  "id",
  "customerId",
  "groupId",
  "isPrimary",
  "source",
  "assignedAt",
  "expiresAt",
] as const;
const groupMembershipOrderFields = [
  "id",
  "isPrimary",
  "source",
  "assignedAt",
  "expiresAt",
] as const;
const groupMembershipWhere = generateWhere(
  customerGroupMembershipRelayQuery,
  "CustomerGroupMembership",
  groupMembershipWhereFields,
  { id: "ID", customerId: "ID", groupId: "ID" },
  { source: "CustomerAssignmentSourceFilter" }
);
const groupMembershipOrder = generateOrder(
  customerGroupMembershipRelayQuery,
  "CustomerGroupMembership",
  groupMembershipOrderFields
);

const tagFields = [
  "id",
  "name",
  "normalizedName",
  "createdAt",
  "updatedAt",
] as const;
const tagWhere = generateWhere(
  customerTagRelayQuery,
  "CustomerTag",
  tagFields,
  { id: "ID" }
);
const tagOrder = generateOrder(customerTagRelayQuery, "CustomerTag", tagFields);

const tagAssignmentWhere = generateWhere(
  customerTagAssignmentRelayQuery,
  "CustomerTagAssignment",
  ["id", "customerId", "tagId", "assignedById", "assignedAt"],
  { id: "ID", customerId: "ID", tagId: "ID" }
);
const tagAssignmentOrder = generateOrder(
  customerTagAssignmentRelayQuery,
  "CustomerTagAssignment",
  ["id", "assignedAt"]
);

const segmentWhereFields = [
  "id",
  "name",
  "description",
  "type",
  "status",
  "customersCount",
  "createdById",
  "createdAt",
  "updatedAt",
] as const;
const segmentOrderFields = [
  "id",
  "name",
  "type",
  "status",
  "customersCount",
  "createdAt",
  "updatedAt",
] as const;
const segmentWhere = generateWhere(
  customerSegmentRelayQuery,
  "CustomerSegment",
  segmentWhereFields,
  {
    id: "ID",
    customersCount: "Int",
    createdAt: "DateTime",
    updatedAt: "DateTime",
  },
  {
    type: "CustomerSegmentTypeFilter",
    status: "CustomerSegmentStatusFilter",
  }
);
const segmentOrder = generateOrder(
  customerSegmentRelayQuery,
  "CustomerSegment",
  segmentOrderFields
);

const segmentMembershipWhereFields = [
  "id",
  "customerId",
  "segmentId",
  "source",
  "evaluatedAt",
  "expiresAt",
] as const;
const segmentMembershipOrderFields = [
  "id",
  "source",
  "evaluatedAt",
  "expiresAt",
] as const;
const segmentMembershipWhere = generateWhere(
  customerSegmentMembershipRelayQuery,
  "CustomerSegmentMembership",
  segmentMembershipWhereFields,
  { id: "ID", customerId: "ID", segmentId: "ID" },
  { source: "CustomerAssignmentSourceFilter" }
);
const segmentMembershipOrder = generateOrder(
  customerSegmentMembershipRelayQuery,
  "CustomerSegmentMembership",
  segmentMembershipOrderFields
);

const monetaryFields = [
  "id",
  "currencyCode",
  "ordersCount",
  "totalSpentMinor",
  "totalRefundedMinor",
  "netSpentMinor",
  "averageOrderValueMinor",
  "updatedAt",
] as const;
const monetaryWhere = generateWhere(
  customerMonetaryStatisticsRelayQuery,
  "CustomerMonetaryStatistics",
  monetaryFields,
  { id: "ID" },
  {
    totalSpentMinor: "BigIntFilter",
    totalRefundedMinor: "BigIntFilter",
    netSpentMinor: "BigIntFilter",
    averageOrderValueMinor: "BigIntFilter",
  }
);
const monetaryOrder = generateOrder(
  customerMonetaryStatisticsRelayQuery,
  "CustomerMonetaryStatistics",
  monetaryFields
);

const mergeWhereFields = [
  "id",
  "sourceCustomerId",
  "targetCustomerId",
  "status",
  "requestedByType",
  "requestedById",
  "idempotencyKey",
  "errorCode",
  "requestedAt",
  "startedAt",
  "finishedAt",
  "updatedAt",
] as const;
const mergeOrderFields = [
  "id",
  "status",
  "requestedAt",
  "startedAt",
  "finishedAt",
  "updatedAt",
] as const;
const mergeWhere = generateWhere(
  customerMergeRelayQuery,
  "CustomerMerge",
  mergeWhereFields,
  { id: "ID", sourceCustomerId: "ID", targetCustomerId: "ID" },
  { status: "CustomerMergeStatusFilter" }
);
const mergeOrder = generateOrder(
  customerMergeRelayQuery,
  "CustomerMerge",
  mergeOrderFields
);

const dataRequestWhereFields = [
  "id",
  "customerId",
  "type",
  "status",
  "requestedByType",
  "requestedById",
  "legalBasis",
  "requestedAt",
  "dueAt",
  "startedAt",
  "finishedAt",
  "updatedAt",
] as const;
const dataRequestOrderFields = [
  "id",
  "type",
  "status",
  "requestedAt",
  "dueAt",
  "startedAt",
  "finishedAt",
  "updatedAt",
] as const;
const dataRequestWhere = generateWhere(
  customerDataRequestRelayQuery,
  "CustomerDataRequest",
  dataRequestWhereFields,
  { id: "ID", customerId: "ID" },
  {
    type: "CustomerDataRequestTypeFilter",
    status: "CustomerDataRequestStatusFilter",
  }
);
const dataRequestOrder = generateOrder(
  customerDataRequestRelayQuery,
  "CustomerDataRequest",
  dataRequestOrderFields
);

const baseFilters = `# Auto-generated GraphQL base filter types for Customers service.
# Do not edit manually. Run: yarn shopana codegen --service customers

${generateBaseFilterTypes()}
`;

const filters = `# Auto-generated GraphQL filters for Customers service.
# Do not edit manually. Run: yarn shopana codegen --service customers

# ---- Customer ----

${customerWhere}

${customerOrder}

# ---- CustomerAddress ----

${addressWhere}

${addressOrder}

# ---- CustomerTaxIdentifier ----

${taxIdentifierWhere}

${taxIdentifierOrder}

# ---- CustomerTaxExemption ----

${taxExemptionWhere}

${taxExemptionOrder}

# ---- CustomerConsentEvent ----

${consentEventOrder}

# ---- CustomerGroup ----

${groupWhere}

${groupOrder}

# ---- CustomerGroupMembership ----

${groupMembershipWhere}

${groupMembershipOrder}

# ---- CustomerTag ----

${tagWhere}

${tagOrder}

# ---- CustomerTagAssignment ----

${tagAssignmentWhere}

${tagAssignmentOrder}

# ---- CustomerSegment ----

${segmentWhere}

${segmentOrder}

# ---- CustomerSegmentMembership ----

${segmentMembershipWhere}

${segmentMembershipOrder}

# ---- CustomerMonetaryStatistics ----

${monetaryWhere}

${monetaryOrder}

# ---- CustomerMerge ----

${mergeWhere}

${mergeOrder}

# ---- CustomerDataRequest ----

${dataRequestWhere}

${dataRequestOrder}
`;

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(`${outputDirectory}/base-filters.graphql`, baseFilters);
writeFileSync(`${outputDirectory}/filters.graphql`, filters);

console.log("Generated Customers GraphQL filters");
