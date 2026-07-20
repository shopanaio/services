import { z } from "zod";
import type { ProtectedResourceRef } from "@shopana/rbac";
import type { Domain, Resource } from "../../../casbin/CasbinService.js";

const protectedResourceBaseSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID"),
    resourceKind: z.string().trim().min(1).max(64),
    resourceId: z.string().uuid("Invalid resource ID"),
  })
  .strict();

const protectedResourceSchema = protectedResourceBaseSchema
  .extend({
    ownerType: z.string().trim().min(1).max(64).optional(),
    ownerId: z.string().uuid("Invalid owner ID").optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.ownerType) === Boolean(value.ownerId)) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Protected resource owner type and ID must be provided together",
      path: value.ownerType ? ["ownerId"] : ["ownerType"],
    });
  });

/**
 * Single authorization request schema
 */
const authorizationRequestSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    domain: z.string().optional(),
    resource: z.string().min(1, "Resource is required"),
    action: z.string().min(1, "Action is required"),
    protectedResource: protectedResourceSchema.optional(),
  })
  .strict();

/**
 * BatchAuthorize input schema
 */
export const batchAuthorizeInputSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID"),
    requests: z
      .array(authorizationRequestSchema)
      .min(1, "At least one request is required"),
  })
  .strict();

export type BatchAuthorizeInput = z.infer<typeof batchAuthorizeInputSchema>;

export interface AuthorizationRequest {
  userId: string;
  domain?: Domain;
  resource: Resource;
  action: string;
  protectedResource?: ProtectedResourceRef;
}

export interface BatchAuthorizeParams {
  organizationId: string;
  requests: AuthorizationRequest[];
}

export interface BatchAuthorizeResult {
  results: boolean[];
}
