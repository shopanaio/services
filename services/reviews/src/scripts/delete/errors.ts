import type { UserError } from "../../kernel/BaseScript.js";

export function internalError(): UserError[] {
  return [{ message: "Internal error", code: "INTERNAL_ERROR" }];
}

export function notFound(entity: string, field = "id"): UserError[] {
  return [{ message: `${entity} not found`, field: [field], code: "NOT_FOUND" }];
}
