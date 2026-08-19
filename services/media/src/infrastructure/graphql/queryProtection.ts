import type { GraphQLFormattedError } from "graphql";
import depthLimit from "graphql-depth-limit";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import { isDevelopment, type GlobalConfig } from "@shopana/shared-service-config";

const MAX_QUERY_DEPTH = 8;

const ComplexityLimitRule = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10, // each list field multiplies the cost of its subtree
});

/**
 * Shared depth/complexity limits, introspection gating, and error masking
 * for both the admin and storefront Apollo servers, so tuning changes can't
 * drift between the two.
 */
export function buildQueryProtectionOptions(global: GlobalConfig) {
  return {
    introspection: isDevelopment(global),
    validationRules: [depthLimit(MAX_QUERY_DEPTH), ComplexityLimitRule],
    formatError: (formattedError: GraphQLFormattedError): GraphQLFormattedError => {
      if (isDevelopment(global)) return formattedError;
      if (formattedError.extensions?.code) return formattedError;
      return {
        message: "Internal server error",
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      };
    },
  };
}
