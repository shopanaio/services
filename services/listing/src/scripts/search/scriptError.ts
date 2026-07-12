import { AuthorizationError } from "@shopana/shared-kernel";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import { SearchConfigurationInputError } from "./searchConfigurationValidation.js";

export function searchConfigurationUserErrors(error: unknown): UserError[] {
  if (error instanceof SearchConfigurationInputError) {
    return [...error.userErrors];
  }
  if (error instanceof AuthorizationError) {
    return error.errors.map((item) => ({
      message: item.message,
      code: item.code ?? undefined,
      field: item.field ?? undefined,
    }));
  }
  if (
    isUniqueViolation(error, "search_synonym_claim_store_locale_value_pk") ||
    isUniqueViolation(error, "search_synonym_value_normalized_unique")
  ) {
    return [{
      message: "Synonym value is already claimed by another active group",
      field: ["input", "values"],
      code: "SYNONYM_CONFLICT",
    }];
  }
  if (
    isUniqueViolation(error, "search_synonym_group_store_locale_name_unique") ||
    isUniqueViolation(error, "search_product_boost_store_locale_name_unique")
  ) {
    return [{
      message: "A search configuration resource with this name already exists",
      field: ["input", "name"],
      code: "CONFIGURATION_CONFLICT",
    }];
  }
  return [{ message: "Internal error", code: "INTERNAL_ERROR" }];
}
