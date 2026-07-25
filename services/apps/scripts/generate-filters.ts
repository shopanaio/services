import { mkdirSync, writeFileSync } from "node:fs";
import {
  generateBaseFilterTypes,
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { appInstallationRelayQuery } from "../src/repositories/installation/AppInstallationRepository.js";
import { salesChannelConnectionRelayQuery } from "../src/repositories/sales-channel/SalesChannelConnectionRepository.js";

const generatedSchemaDirectory =
  "src/api/graphql-admin/schema/__generated__";

mkdirSync(generatedSchemaDirectory, { recursive: true });

const appInstallationFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  appCode: "String",
  status: "String",
  installedVersion: "String",
  targetVersion: "String",
  manifestHash: "String",
  configurationVersion: "Int",
  healthStatus: "String",
  installedAt: "DateTime",
  suspendedAt: "DateTime",
  uninstalledAt: "DateTime",
  createdAt: "DateTime",
  updatedAt: "DateTime",
};

const appInstallationOptions = {
  includeDescriptions: true,
  fieldTypes: appInstallationFieldTypes,
  excludeFields: [
    "organizationId",
    "storeId",
    "configuration",
    "installedByUserId",
    "lastErrorCode",
    "lastErrorMessage",
  ],
};

const salesChannelConnectionFieldTypes: Record<
  string,
  GraphQLFieldType
> = {
  id: "ID",
  displayName: "String",
  externalAccountId: "String",
  externalAccountLabel: "String",
  status: "String",
  configurationVersion: "Int",
  healthStatus: "String",
  connectedAt: "DateTime",
  suspendedAt: "DateTime",
  disconnectedAt: "DateTime",
  createdAt: "DateTime",
  updatedAt: "DateTime",
};

const salesChannelConnectionOptions = {
  includeDescriptions: true,
  fieldTypes: salesChannelConnectionFieldTypes,
  excludeFields: [
    "organizationId",
    "storeId",
    "installationId",
    "specificationSnapshotId",
    "configuration",
    "lastErrorCode",
    "lastErrorMessage",
  ],
};

const filters = `# Auto-generated GraphQL filter types for Apps service.
# Do not edit manually. Run: shopana codegen -s apps

# ---- AppInstallation ----

${generateWhereInputType(
  appInstallationRelayQuery,
  "AppInstallation",
  appInstallationOptions,
)}

${generateOrderByInputType(
  appInstallationRelayQuery,
  "AppInstallation",
  appInstallationOptions,
)}

# ---- SalesChannelConnection ----

${generateWhereInputType(
  salesChannelConnectionRelayQuery,
  "SalesChannelConnection",
  salesChannelConnectionOptions,
)}

${generateOrderByInputType(
  salesChannelConnectionRelayQuery,
  "SalesChannelConnection",
  salesChannelConnectionOptions,
)}
`;

writeFileSync(
  `${generatedSchemaDirectory}/base-filters.graphql`,
  `# Auto-generated GraphQL base filter types for Apps service.
# Do not edit manually. Run: shopana codegen -s apps

${generateBaseFilterTypes()}
`,
);
writeFileSync(`${generatedSchemaDirectory}/filters.graphql`, filters);

console.log("✅ Generated Apps GraphQL filters and sorting inputs");
