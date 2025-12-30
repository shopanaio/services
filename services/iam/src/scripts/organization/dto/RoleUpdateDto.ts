import { z } from "zod";
import type { UserError } from "@shopana/shared-kernel";
import { permissionInputSchema } from "./RoleCreateDto.js";

/**
 * Role update input schema
 */
export const roleUpdateInputSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  id: z.string().uuid("Invalid role ID"),
  displayName: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  permissions: z.array(permissionInputSchema).optional(),
});

export type RoleUpdateInput = z.infer<typeof roleUpdateInputSchema>;

/**
 * Script params
 */
export interface RoleUpdateParams {
  organizationId: string;
  id: string;
  displayName?: string;
  description?: string;
  permissions?: Array<{
    resource: string;
    action: "read" | "write" | "admin";
  }>;
}

/**
 * Updated role data
 */
export interface UpdatedRole {
  organizationId: string;
  domain: string;
  name: string;
}

/**
 * Script result
 */
export interface RoleUpdateResult {
  role: UpdatedRole | null;
  userErrors: UserError[];
}
