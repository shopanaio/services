import { z } from "zod";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { Organization } from "../../../repositories/models/authorization.js";

/**
 * Slug validation schema
 * Must be lowercase, alphanumeric, hyphens allowed (not at start/end), 3-64 chars
 */
export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(64, "Slug must be at most 64 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  )
  .refine(
    (slug) => !slug.startsWith("-") && !slug.endsWith("-"),
    "Slug cannot start or end with a hyphen"
  );

/**
 * Organization name validation schema
 */
export const organizationNameSchema = z
  .string()
  .min(1, "Organization name is required")
  .max(256, "Organization name must be at most 256 characters")
  .transform((name) => name.trim())
  .refine((name) => name.length > 0, "Organization name is required");

/**
 * Organization create input schema
 */
export const organizationCreateInputSchema = z.object({
  name: organizationNameSchema,
  slug: slugSchema,
});

export type OrganizationCreateInput = z.infer<
  typeof organizationCreateInputSchema
>;

/**
 * Script params
 */
export interface OrganizationCreateParams {
  name: string;
  slug: string;
}

/**
 * Script result
 */
export interface OrganizationCreateResult {
  organization: Organization | null;
  userErrors: UserError[];
}
