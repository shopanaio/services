import { z } from "zod";
import type { Domain } from "../../../casbin/CasbinService.js";

/**
 * Role permissions schema
 */
const rolePermissionsSchema = z.object({
  allow: z.array(
    z.object({
      resource: z.string().min(1),
      actions: z.array(z.string().min(1)).min(1),
    })
  ),
  deny: z
    .array(
      z.object({
        resource: z.string().min(1),
        actions: z.array(z.string().min(1)).min(1),
      })
    )
    .optional(),
});

/**
 * Role config schema
 */
const roleConfigSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string(),
  permissions: rolePermissionsSchema,
});

/**
 * CreateRoles input schema
 */
export const createRolesInputSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  domain: z.string().min(1, "Domain is required"),
  roles: z.array(roleConfigSchema).min(1, "At least one role is required"),
});

export type CreateRolesInput = z.infer<typeof createRolesInputSchema>;

export interface RolePermissions {
  allow: Array<{ resource: string; actions: string[] }>;
  deny?: Array<{ resource: string; actions: string[] }>;
}

export interface RoleConfig {
  name: string;
  displayName: string;
  description: string;
  permissions: RolePermissions;
}

export interface CreateRolesParams {
  userId: string;
  organizationId: string;
  domain: Domain;
  roles: RoleConfig[];
}

export interface CreateRolesResult {
  success: boolean;
  error?: string;
}
