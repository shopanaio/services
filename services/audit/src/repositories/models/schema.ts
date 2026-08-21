import { pgSchema } from "drizzle-orm/pg-core";

export const auditSchema = pgSchema("audit");

export const auditActionEnum = auditSchema.enum("audit_action", ["CREATE", "UPDATE", "DELETE"]);

export const auditActorTypeEnum = auditSchema.enum("audit_actor_type", [
  "USER",
  "SERVICE",
  "SYSTEM",
]);

export const auditOperationActionEnum = auditSchema.enum("audit_operation_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "MOVE",
  "LINK",
  "UNLINK",
]);
