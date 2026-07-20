import { z } from "zod";
import type {
  BrokerAuthorizeParams,
  Domain,
  ResourceName,
  ServiceLinkedAuthorizationDetails,
} from "@shopana/rbac";

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
export type { BrokerAuthorizeParams as AuthorizeParams };
export type { Domain, ResourceName };

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  deniedCode?: "RESOURCE_SERVICE_LINKED";
  serviceLinkedDetails?: ServiceLinkedAuthorizationDetails;
}
