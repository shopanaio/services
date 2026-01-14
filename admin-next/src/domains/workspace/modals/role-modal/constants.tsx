import { EyeOutlined, EditOutlined, SafetyOutlined } from "@ant-design/icons";
import { Action } from "@/graphql/types";
import type { ApiResourceDefinition } from "@/graphql/types";
import type {
  IPermissionCategory,
  IPermissionLevel,
  IPermissionPreset,
  IResourcePermission,
} from "./types";

/**
 * Category definitions for grouping resources in UI
 */
const CATEGORY_CONFIG: Record<string, { label: string; description: string }> = {
  org: {
    label: "Organization",
    description: "Organization-level settings and management",
  },
  store: {
    label: "Store Management",
    description: "E-commerce store operations and data",
  },
};

/**
 * Build permission categories from API resources
 */
export function buildPermissionCategories(
  apiResources: ApiResourceDefinition[]
): IPermissionCategory[] {
  const categoryMap = new Map<string, IPermissionCategory>();

  for (const resource of apiResources) {
    const prefix = resource.name.split(".")[0];
    const config = CATEGORY_CONFIG[prefix] ?? {
      label: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      description: `${prefix} resources`,
    };

    if (!categoryMap.has(prefix)) {
      categoryMap.set(prefix, {
        id: prefix,
        label: config.label,
        description: config.description,
        resources: [],
      });
    }

    categoryMap.get(prefix)!.resources.push({
      id: resource.name.replace(".", "-"),
      resource: resource.name,
      label: resource.displayName ?? resource.name,
      description: resource.displayName ?? resource.name,
    });
  }

  // Sort categories: org first, then store, then others
  const order = ["org", "store"];
  return Array.from(categoryMap.values()).sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return a.id.localeCompare(b.id);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
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
    label: "Full Access",
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
export function getDefaultPermissions(resources: string[]): IResourcePermission[] {
  return resources.map((resource) => ({ resource, action: null }));
}

/**
 * Detect which preset matches current permissions
 */
export function detectPreset(permissions: IResourcePermission[]): string {
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
