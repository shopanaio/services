import type {
  ApiResourceDefinition,
  ApiRole,
  ApiRolePermissionInput,
} from "@/graphql/types";
import { Action } from "@/graphql/types";

/**
 * Modal modes for role management
 */
export type RoleModalMode = "create" | "edit" | "view";

/**
 * Permission resource category for UI grouping.
 * Uses ApiResourceDefinition directly instead of local wrapper type.
 */
export interface IPermissionCategory {
  id: string;
  label: string;
  description?: string;
  resources: ApiResourceDefinition[];
}

/**
 * Permission level with visual properties (UI-only)
 */
export interface IPermissionLevel {
  action: Action;
  label: string;
  description: string;
  color: string;
}

/**
 * Permission state for form - extends API input type to allow null (no permission).
 * API type requires action, but form state needs to represent "no permission selected".
 */
export type FormPermission = {
  resource: string;
  action: Action | null;
};

/**
 * Permission preset template (UI-only)
 */
export interface IPermissionPreset {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  getPermissions: (resources: string[]) => FormPermission[];
}

/**
 * Transform form permissions to API format.
 * Filters out null actions since API only accepts defined permissions.
 */
export function toApiPermissions(
  permissions: FormPermission[]
): ApiRolePermissionInput[] {
  return permissions
    .filter((p): p is FormPermission & { action: Action } => p.action !== null)
    .map((p) => ({
      resource: p.resource,
      action: p.action,
    }));
}

/**
 * Transform API role permissions to form format.
 * Creates dense array with all resources (null for no permission).
 */
export function fromApiPermissions(
  role: ApiRole,
  allResources: string[]
): FormPermission[] {
  return allResources.map((resource) => {
    const apiPerm = role.permissions.find((p) => p.resource === resource);
    if (!apiPerm) {
      return { resource, action: null };
    }
    // Determine the highest action level from API's actions array
    if (apiPerm.actions.includes("admin")) {
      return { resource, action: Action.Admin };
    }
    if (apiPerm.actions.includes("write")) {
      return { resource, action: Action.Write };
    }
    if (apiPerm.actions.includes("read")) {
      return { resource, action: Action.Read };
    }
    return { resource, action: null };
  });
}
