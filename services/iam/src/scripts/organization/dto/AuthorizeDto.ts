import { z } from "zod";
import type { AuthorizeParams, Domain, ResourceName } from "@shopana/rbac";

const protectedResourceSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID"),
    resourceKind: z.string().trim().min(1).max(64),
    resourceId: z.string().uuid("Invalid resource ID"),
  })
  .strict();

const linkedOwnerSchema = protectedResourceSchema
  .extend({
    linkedService: z.string().trim().min(1).max(64),
    linkedOwnerType: z.string().trim().min(1).max(64),
    linkedOwnerId: z.string().uuid("Invalid linked owner ID"),
  })
  .strict();

export const authorizeInputSchema = z
  .object({
    subject: z.string().min(1, "Subject (user ID) is required"),
    organizationId: z.string().uuid("Invalid organization ID").optional(),
    organizationName: z.string().min(1).optional(),
    domain: z.string().optional(),
    resource: z.string().min(1, "Resource is required"),
    action: z.string().min(1, "Action is required"),
    protectedResource: protectedResourceSchema.optional(),
    linkedOwner: linkedOwnerSchema.optional(),
  })
  .strict();

export type AuthorizeInput = z.infer<typeof authorizeInputSchema>;

// Re-export from @shopana/rbac
export type { AuthorizeParams, Domain, ResourceName };

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}
