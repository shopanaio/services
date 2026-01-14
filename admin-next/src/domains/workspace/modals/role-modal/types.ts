import type { ApiRole, ApiRolePermissionInput } from "@/graphql/types";
import { Action } from "@/graphql/types";

/**
 * Modal modes for role management
 */
export type RoleModalMode = "create" | "edit" | "view";

/**
 * Permission resource category for UI grouping
 */
export interface IPermissionCategory {
  id: string;
  label: string;
  description?: string;
  resources: IPermissionResource[];
}

/**
 * Individual permission resource
 */
export interface IPermissionResource {
  id: string;
  resource: string;
  label: string;
  description: string;
}

/**
 * Permission level with visual properties
 */
export interface IPermissionLevel {
  action: Action;
  label: string;
  description: string;
  color: string;
}

/**
 * Permission state for a single resource
 */
export interface IResourcePermission {
  resource: string;
  action: Action | null;
}

/**
 * Role form data
 */
export interface IRoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissions: IResourcePermission[];
}

/**
 * Permission preset template
 */
export interface IPermissionPreset {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  getPermissions: (resources: string[]) => IResourcePermission[];
}

/**
 * Props for role modal callback
 */
export interface IRoleModalCallbacks {
  onCreate?: (input: {
    name: string;
    displayName: string;
    description?: string;
    permissions: ApiRolePermissionInput[];
  }) => Promise<void>;
  onUpdate?: (input: {
    displayName?: string;
    description?: string;
    permissions?: ApiRolePermissionInput[];
  }) => Promise<void>;
}

/**
 * Transform form permissions to API format
 */
export function toApiPermissions(
  permissions: IResourcePermission[]
): ApiRolePermissionInput[] {
  return permissions
    .filter((p) => p.action !== null)
    .map((p) => ({
      resource: p.resource,
      action: p.action!,
    }));
}

/**
 * Transform API permissions to form format
 */
export function fromApiPermissions(
  role: ApiRole,
  allResources: string[]
): IResourcePermission[] {
  return allResources.map((resource) => {
    const apiPerm = role.permissions.find((p) => p.resource === resource);
    if (!apiPerm) {
      return { resource, action: null };
    }
    // Determine the highest action level
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
