import type { UserError } from "../../kernel/BaseScript.js";

export function internalError(): UserError[] {
  return [{ message: "Internal error", code: "INTERNAL_ERROR" }];
}

export function notFound(entity: string, field = "id"): UserError[] {
  return [{ message: `${entity} not found`, field: [field], code: "NOT_FOUND" }];
}

export function conflict(field: string): UserError[] {
  return [
    {
      message: "The entity was modified by another operation",
      field: [field],
      code: "CONFLICT",
    },
  ];
}

export function invalidDate(field: string): UserError[] {
  return [{ message: `${field} must be a valid date`, field: [field], code: "INVALID_DATE" }];
}
