import { UserError } from "@shopana/shared-kernel";
import { z } from "zod";

/**
 * Role assignment schema
 */
export const roleAssignmentSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .refine(
      (d) => d === "org" || d === "store:*" || d.startsWith("store:"),
      "Domain must be 'org', 'store:*', or 'store:{storeId}'"
    ),
  role: z.string().min(1, "Role is required"),
});

/**
 * Member invite input schema
 */
export const memberInviteInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((e) => e.toLowerCase()),
  roles: z
    .array(roleAssignmentSchema)
    .min(1, "At least one role assignment is required"),
});

export type MemberInviteInput = z.infer<typeof memberInviteInputSchema>;

/**
 * Script params (organizationId from input)
 */
export interface MemberInviteParams {
  organizationId: string;
  email: string;
  roles: Array<{
    domain: string;
    role: string;
  }>;
}

/**
 * Member data returned after invite
 */
export interface InvitedMember {
  id: string;
  userId: string;
  role: string;
  domain: string;
  organizationId: string;
  grantedAt: Date;
  grantedBy: string | null;
}

/**
 * Script result
 */
export interface MemberInviteResult {
  member: InvitedMember | null;
  userErrors: UserError[];
}
