import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Role delete input schema
 */
export const roleDeleteInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  id: z.string().uuid("Invalid role ID"),
});

export type RoleDeleteInput = z.infer<typeof roleDeleteInputSchema>;

/**
 * Script params
 */
export interface RoleDeleteParams {
  organizationId: string;
  id: string;
}

/**
 * Script result
 */
export interface RoleDeleteResult {
  deletedRoleName: string | null;
  userErrors: UserError[];
}
