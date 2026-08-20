import type { UserError } from "../../kernel/BaseScript.js";

export interface DiscountSectionResult {
  changed: boolean;
  userErrors: UserError[];
}

export function sectionSuccess(changed = true): DiscountSectionResult {
  return { changed, userErrors: [] };
}

export function sectionErrors(userErrors: UserError[]): DiscountSectionResult {
  return { changed: false, userErrors };
}

export function internalSectionError(): DiscountSectionResult {
  return sectionErrors([{ message: "Internal error", code: "INTERNAL_ERROR" }]);
}
