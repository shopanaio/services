import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Member role change input schema
 */
export const memberRoleChangeInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  userId: z.string().uuid("Invalid user ID"),
  domain: z.string().min(1, "Domain is required"),
  role: z.string().min(1, "Role is required"),
});

export type MemberRoleChangeInput = z.infer<typeof memberRoleChangeInputSchema>;

/**
 * Script params
 */
export interface MemberRoleChangeParams {
  organizationId: string;
  userId: string;
  domain: string;
  role: string;
}

/**
 * Changed member data
 */
export interface ChangedMember {
  userId: string;
  role: string;
  domain: string;
  organizationId: string;
}

/**
 * Script result
 */
export interface MemberRoleChangeResult {
  member: ChangedMember | null;
  userErrors: UserError[];
}
