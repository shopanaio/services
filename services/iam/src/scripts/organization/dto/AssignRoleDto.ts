import { z } from "zod";
import type { Domain } from "../../../casbin/CasbinService.js";

export const assignRoleInputSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  domain: z.string().min(1, "Domain is required"),
  roleName: z.string().min(1, "Role name is required"),
});

export type AssignRoleInput = z.infer<typeof assignRoleInputSchema>;

export interface AssignRoleParams {
  userId: string;
  organizationId: string;
  domain: Domain;
  roleName: string;
}

export interface AssignRoleResult {
  success: boolean;
  error?: string;
}
