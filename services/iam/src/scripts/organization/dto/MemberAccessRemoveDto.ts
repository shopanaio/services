import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Member access remove input schema
 */
export const memberAccessRemoveInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  userId: z.string().uuid("Invalid user ID"),
  domain: z.string().min(1, "Domain is required"),
});

export type MemberAccessRemoveInput = z.infer<
  typeof memberAccessRemoveInputSchema
>;

/**
 * Script params
 */
export interface MemberAccessRemoveParams {
  organizationId: string;
  userId: string;
  domain: string;
}

/**
 * Script result
 */
export interface MemberAccessRemoveResult {
  success: boolean;
  userErrors: UserError[];
}
