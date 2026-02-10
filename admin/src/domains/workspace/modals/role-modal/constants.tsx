import { EyeOutlined, EditOutlined, SafetyOutlined } from "@ant-design/icons";
import { Action } from "@/graphql/types";
import type { ApiResourceDefinition } from "@/graphql/types";
import type {
  IPermissionCategory,
  IPermissionLevel,
  IPermissionPreset,
  FormPermission,
} from "./types";

/**
 * Build single permission category from API resources.
 */
export function buildPermissionCategories(
  apiResources: ApiResourceDefinition[]
): IPermissionCategory[] {
  return [
    {
      id: "permissions",
      label: "Permissions",
      description: "Resource access permissions",
      resources: apiResources,
    },
  ];
}

/**
 * Get all resource names from API resources
 */
export function getAllResourceNames(apiResources: ApiResourceDefinition[]): string[] {
  return apiResources.map((r) => r.name);
}

/**
 * Permission levels with hierarchy
 * Admin > Write > Read
 */
export const PERMISSION_LEVELS: IPermissionLevel[] = [
  {
    action: Action.Read,
    label: "View",
    description: "Can view data only",
    color: "blue",
  },
  {
    action: Action.Write,
    label: "Edit",
    description: "Can view and modify data",
    color: "orange",
  },
  {
    action: Action.Admin,
    label: "Admin",
    description: "Full control including delete and settings",
    color: "red",
  },
];

/**
 * Quick permission presets for common role configurations
 */
export const PERMISSION_PRESETS: IPermissionPreset[] = [
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only access to all resources",
    icon: <EyeOutlined />,
    getPermissions: (resources) =>
      resources.map((resource) => ({ resource, action: Action.Read })),
  },
  {
    id: "editor",
    label: "Editor",
    description: "Can view and edit, but not delete or manage settings",
    icon: <EditOutlined />,
    getPermissions: (resources) =>
      resources.map((resource) => ({ resource, action: Action.Write })),
  },
  {
    id: "admin",
    label: "Administrator",
    description: "Full access to all resources",
    icon: <SafetyOutlined />,
    getPermissions: (resources) =>
      resources.map((resource) => ({ resource, action: Action.Admin })),
  },
  {
    id: "custom",
    label: "Custom",
    description: "Configure permissions individually",
    icon: null,
    getPermissions: () => [], // No preset - keeps current
  },
];

/**
 * Get default empty permissions for resources
 */
export function getDefaultPermissions(resources: string[]): FormPermission[] {
  return resources.map((resource) => ({ resource, action: null }));
}

/**
 * Detect which preset matches current permissions
 */
export function detectPreset(permissions: FormPermission[]): string {
  const hasAny = permissions.some((p) => p.action !== null);
  if (!hasAny) return "custom";

  const allAdmin = permissions.every((p) => p.action === Action.Admin);
  const allWrite = permissions.every((p) => p.action === Action.Write);
  const allRead = permissions.every((p) => p.action === Action.Read);

  if (allAdmin) return "admin";
  if (allWrite) return "editor";
  if (allRead) return "viewer";
  return "custom";
}
