import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Organization delete input schema
 */
export const organizationDeleteInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
});

export type OrganizationDeleteInput = z.infer<
  typeof organizationDeleteInputSchema
>;

/**
 * Script params
 */
export interface OrganizationDeleteParams {
  organizationId: string;
}

/**
 * Script result
 */
export interface OrganizationDeleteResult {
  deletedOrganizationId: string | null;
  userErrors: UserError[];
}
