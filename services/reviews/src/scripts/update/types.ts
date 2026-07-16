import type { UserError } from "../../kernel/BaseScript.js";

export interface ReviewSectionResult {
  changed: boolean;
  entityId?: string;
  userErrors: UserError[];
}

export function sectionSuccess(
  changed = true,
  entityId?: string
): ReviewSectionResult {
  return { changed, entityId, userErrors: [] };
}

export function sectionErrors(userErrors: UserError[]): ReviewSectionResult {
  return { changed: false, userErrors };
}

export function internalSectionError(): ReviewSectionResult {
  return sectionErrors([
    { message: "Internal error", code: "INTERNAL_ERROR" },
  ]);
}
