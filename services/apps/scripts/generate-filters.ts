import { mkdirSync, writeFileSync } from "node:fs";
import {
  generateBaseFilterTypes,
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { appRelayQuery } from "../src/repositories/app/AppRepository.js";

const generatedSchemaDirectory = "src/api/graphql-admin/schema/__generated__";

mkdirSync(generatedSchemaDirectory, { recursive: true });

const appFieldTypes: Record<string, GraphQLFieldType> = {
  code: "String",
  version: "String",
  displayName: "String",
  capabilities: "String",
  status: "String",
  installed: "Boolean",
  updatedAt: "DateTime",
};

const appOptions = {
  includeDescriptions: true,
  fieldTypes: appFieldTypes,
  excludeFields: ["storeId", "installationId"],
};

const filters = `# Auto-generated GraphQL filter types for Apps service.
# Do not edit manually. Run: shopana codegen -s apps

# ---- App ----

${generateWhereInputType(appRelayQuery, "App", appOptions)}

${generateOrderByInputType(appRelayQuery, "App", appOptions)}
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
