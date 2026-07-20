import { z } from "zod";
import type {
  ProtectedResourceAuthorizeParams,
  ServiceLinkedAuthorizationDetails,
} from "@shopana/rbac";

const protectedResourceSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID"),
    resourceKind: z.string().trim().min(1).max(64),
    resourceId: z.string().uuid("Invalid resource ID"),
    ownerType: z.string().trim().min(1).max(64).optional(),
    ownerId: z.string().uuid("Invalid owner ID").optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Boolean(value.ownerType) === Boolean(value.ownerId)) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Protected resource owner type and ID must be provided together",
      path: value.ownerType ? ["ownerId"] : ["ownerType"],
    });
  });

export const protectedResourceAuthorizeInputSchema = z
  .object({
    protectedResource: protectedResourceSchema,
  })
  .strict();

export type ProtectedResourceAuthorizeInput = z.infer<
  typeof protectedResourceAuthorizeInputSchema
>;

export type { ProtectedResourceAuthorizeParams };

export interface ProtectedResourceAuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  deniedCode?: "RESOURCE_SERVICE_LINKED";
  serviceLinkedDetails?: ServiceLinkedAuthorizationDetails;
}
