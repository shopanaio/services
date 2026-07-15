import { mkdirSync, writeFileSync } from "fs";
import { generateBaseFilterTypes } from "@shopana/drizzle-query";

const outputDirectory = "src/api/graphql-admin/schema/__generated__";

const baseFilters = `# Auto-generated GraphQL base filter types for Customers service.
# Do not edit manually. Run: yarn shopana codegen --service customers

${generateBaseFilterTypes()}
`;

const filters = `# Auto-generated GraphQL filters for Customers service.
# Do not edit manually. Run: yarn shopana codegen --service customers

scalar _CustomersGeneratedFilterPlaceholder @inaccessible
`;

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(`${outputDirectory}/base-filters.graphql`, baseFilters);
writeFileSync(`${outputDirectory}/filters.graphql`, filters);

console.log("Generated Customers GraphQL filters");
