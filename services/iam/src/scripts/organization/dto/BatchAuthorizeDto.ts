import { z } from "zod";
import type { Domain, Resource } from "../../../casbin/CasbinService.js";

/**
 * Single authorization request schema
 */
const authorizationRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  domain: z.string().optional(),
  resource: z.string().min(1, "Resource is required"),
  action: z.string().min(1, "Action is required"),
});

/**
 * BatchAuthorize input schema
 */
export const batchAuthorizeInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  requests: z
    .array(authorizationRequestSchema)
    .min(1, "At least one request is required"),
});

export type BatchAuthorizeInput = z.infer<typeof batchAuthorizeInputSchema>;

export interface AuthorizationRequest {
  userId: string;
  domain?: Domain;
  resource: Resource;
  action: string;
}

export interface BatchAuthorizeParams {
  organizationId: string;
  requests: AuthorizationRequest[];
}

export interface BatchAuthorizeResult {
  results: boolean[];
}
