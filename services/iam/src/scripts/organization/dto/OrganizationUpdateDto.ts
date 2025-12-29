import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";
import type { Organization } from "../../../repositories/models/authorization.js";
import { organizationNameSchema } from "./OrganizationCreateDto.js";

/**
 * Organization update input schema
 */
export const organizationUpdateInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  name: organizationNameSchema.optional(),
  displayName: organizationNameSchema.optional(),
});

export type OrganizationUpdateInput = z.infer<
  typeof organizationUpdateInputSchema
>;

/**
 * Script params
 */
export interface OrganizationUpdateParams {
  organizationId: string;
  name?: string;
  displayName?: string;
}

/**
 * Script result
 */
export interface OrganizationUpdateResult {
  organization: Organization | null;
  userErrors: UserError[];
}
