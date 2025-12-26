import { z } from "zod";
import type { Domain, Resource } from "../../../casbin/CasbinService.js";

export const authorizeInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().uuid("Invalid organization ID"),
  domain: z.string().optional(),
  resource: z.string().min(1, "Resource is required"),
  action: z.string().min(1, "Action is required"),
});

export type AuthorizeInput = z.infer<typeof authorizeInputSchema>;

export interface AuthorizeParams {
  userId: string;
  organizationId: string;
  /** Domain scope. Defaults to "org" if not provided. */
  domain?: Domain;
  resource: Resource;
  action: string;
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}
