import { z } from "zod";
import type { BrokerAuthorizeParams, Domain, ResourceName } from "@shopana/rbac";

export const authorizeInputSchema = z
  .object({
    subject: z.string().min(1, "Subject (user ID) is required"),
    organizationId: z.string().uuid("Invalid organization ID").optional(),
    organizationName: z.string().min(1).optional(),
    domain: z.string().optional(),
    resource: z.string().min(1, "Resource is required"),
    action: z.string().min(1, "Action is required"),
  })
  .strict();

export type AuthorizeInput = z.infer<typeof authorizeInputSchema>;

// Re-export from @shopana/rbac
export type { BrokerAuthorizeParams as AuthorizeParams };
export type { Domain, ResourceName };

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}
