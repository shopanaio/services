import { z } from "zod";
import type { Domain } from "../../../casbin/CasbinService.js";

/**
 * Permission schema
 */
const permissionSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
});

/**
 * Role config schema
 */
const roleConfigSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string(),
  permissions: z.array(permissionSchema).min(1, "At least one permission is required"),
});

/**
 * CreateRoles input schema
 */
export const createRolesInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().uuid("Invalid organization ID"),
  domain: z.string().min(1, "Domain is required"),
  roles: z.array(roleConfigSchema).min(1, "At least one role is required"),
});

export type CreateRolesInput = z.infer<typeof createRolesInputSchema>;

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RoleConfig {
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
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
