import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerSectionResult {
  changed: boolean;
  userErrors: UserError[];
}

export function sectionSuccess(changed = true): CustomerSectionResult {
  return { changed, userErrors: [] };
}

export function sectionErrors(userErrors: UserError[]): CustomerSectionResult {
  return { changed: false, userErrors };
}

export function internalSectionError(): CustomerSectionResult {
  return sectionErrors([{ message: "Internal error", code: "INTERNAL_ERROR" }]);
}
