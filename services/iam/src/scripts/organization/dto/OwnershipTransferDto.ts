import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Ownership transfer input schema
 */
export const ownershipTransferInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  newOwnerId: z.string().min(1, "New owner ID is required"),
});

export type OwnershipTransferInput = z.infer<
  typeof ownershipTransferInputSchema
>;

/**
 * Script params
 */
export interface OwnershipTransferParams {
  organizationId: string;
  newOwnerId: string;
}

/**
 * Script result
 */
export interface OwnershipTransferResult {
  success: boolean;
  userErrors: UserError[];
}
