import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";

/**
 * Permission input schema
 * Action hierarchy: read < write < admin
 */
export const permissionInputSchema = z.object({
  resource: z.string().min(1, "Resource is required"),
  action: z.enum(["read", "write", "admin"], {
    errorMap: () => ({ message: "Action must be 'read', 'write', or 'admin'" }),
  }),
});

/**
 * Role create input schema
 */
export const roleCreateInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  domain: z.string().min(1, "Domain is required"),
  name: z
    .string()
    .min(1, "Role name is required")
    .max(64, "Role name must be at most 64 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Role name must contain only lowercase letters, numbers, underscores, and hyphens"
    ),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(128, "Display name must be at most 128 characters"),
  description: z.string().max(512, "Description must be at most 512 characters").optional(),
  permissions: z.array(permissionInputSchema).min(1, "At least one permission is required"),
});

export type RoleCreateInput = z.infer<typeof roleCreateInputSchema>;

/**
 * Script params
 */
export interface RoleCreateParams {
  organizationId: string;
  domain: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: Array<{
    resource: string;
    action: "read" | "write" | "admin";
  }>;
}

/**
 * Created role data
 */
export interface CreatedRole {
  organizationId: string;
  domain: string;
  name: string;
}

/**
 * Script result
 */
export interface RoleCreateResult {
  role: CreatedRole | null;
  userErrors: UserError[];
}
