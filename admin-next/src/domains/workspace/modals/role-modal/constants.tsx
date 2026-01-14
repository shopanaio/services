import { EyeOutlined, EditOutlined, SafetyOutlined } from "@ant-design/icons";
import { Action } from "@/graphql/types";
import type {
  IPermissionCategory,
  IPermissionLevel,
  IPermissionPreset,
  IResourcePermission,
} from "./types";

/**
 * Permission categories with grouped resources
 * Aligned with @shopana/rbac definitions
 */
export const PERMISSION_CATEGORIES: IPermissionCategory[] = [
  {
    id: "organization",
    label: "Organization",
    description: "Organization-level settings and management",
    resources: [
      {
        id: "org-profile",
        resource: "org.profile",
        label: "Organization Profile",
        description: "Organization profile and settings",
      },
      {
        id: "org-members",
        resource: "org.members",
        label: "Team Members",
        description: "Organization members management",
      },
      {
        id: "org-roles",
        resource: "org.roles",
        label: "Roles",
        description: "Role management",
      },
      {
        id: "org-stores",
        resource: "org.stores",
        label: "Stores",
        description: "Store management",
      },
      {
        id: "org-access",
        resource: "org.access",
        label: "Member Access",
        description: "Member access to stores",
      },
    ],
  },
  {
    id: "store",
    label: "Store Management",
    description: "E-commerce store operations and data",
    resources: [
      {
        id: "store-profile",
        resource: "store.profile",
        label: "Store Profile",
        description: "Store profile and settings",
      },
      {
        id: "store-members",
        resource: "store.members",
        label: "Store Members",
        description: "Store members management",
      },
      {
        id: "store-roles",
        resource: "store.roles",
        label: "Store Roles",
        description: "Store role management",
      },
      {
        id: "store-access",
        resource: "store.access",
        label: "Store Access",
        description: "Member permissions in store",
      },
      {
        id: "store-inventory",
        resource: "store.inventory",
        label: "Inventory",
        description: "Store inventory management",
      },
      {
        id: "store-orders",
        resource: "store.orders",
        label: "Orders",
        description: "Store order management",
      },
      {
        id: "store-listing",
        resource: "store.listing",
        label: "Listings",
        description: "Store listing management",
      },
      {
        id: "store-reviews",
        resource: "store.reviews",
        label: "Reviews",
        description: "Store reviews management",
      },
      {
        id: "store-search",
        resource: "store.search",
        label: "Search",
        description: "Store search management",
      },
    ],
  },
];

/**
 * All available resources flattened
 */
export const ALL_RESOURCES = PERMISSION_CATEGORIES.flatMap((cat) =>
  cat.resources.map((r) => r.resource)
);

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
 * Get default empty permissions for all resources
 */
export function getDefaultPermissions(): IResourcePermission[] {
  return ALL_RESOURCES.map((resource) => ({ resource, action: null }));
}

/**
 * Detect which preset matches current permissions
 */
export function detectPreset(permissions: IResourcePermission[]): string {
  const allRead = permissions.every(
    (p) => p.action === Action.Read || p.action === null
  );
  const allWrite = permissions.every(
    (p) => p.action === Action.Write || p.action === null
  );
  const allAdmin = permissions.every(
    (p) => p.action === Action.Admin || p.action === null
  );
  const hasAny = permissions.some((p) => p.action !== null);

  if (!hasAny) return "custom";
  if (allAdmin && permissions.every((p) => p.action === Action.Admin)) return "admin";
  if (allWrite && permissions.every((p) => p.action === Action.Write)) return "editor";
  if (allRead && permissions.every((p) => p.action === Action.Read)) return "viewer";
  return "custom";
}
