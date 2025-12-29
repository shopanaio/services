import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Member remove input schema
 */
export const memberRemoveInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export type MemberRemoveInput = z.infer<typeof memberRemoveInputSchema>;

/**
 * Script params
 */
export interface MemberRemoveParams {
  organizationId: string;
  userId: string;
}

/**
 * Script result
 */
export interface MemberRemoveResult {
  removedMemberId: string | null;
  userErrors: UserError[];
}
