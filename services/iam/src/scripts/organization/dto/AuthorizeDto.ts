import { z } from "zod";
import type {
  AuthorizeParams as RbacAuthorizeParams,
  Domain,
  ResourceName,
  ServiceLinkedAuthorizationDetails,
} from "@shopana/rbac";

const protectedResourceSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID"),
    resourceKind: z.string().trim().min(1).max(64),
    resourceId: z.string().uuid("Invalid resource ID"),
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
  })
  .strict();

export type AuthorizeInput = z.infer<typeof authorizeInputSchema>;

// Re-export from @shopana/rbac
export type AuthorizeParams = Omit<RbacAuthorizeParams, "linkedOwner">;
export type { Domain, ResourceName };

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  deniedCode?: "RESOURCE_SERVICE_LINKED";
  serviceLinkedDetails?: ServiceLinkedAuthorizationDetails;
}
