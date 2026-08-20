import type { ApiHeadlessStorefrontPermissionDefinition } from "@/graphql/types";

const permissionGroups = [
  { label: "Catalog & inventory", resources: ["catalog", "inventory"] },
  { label: "Checkout", resources: ["checkout"] },
  { label: "Customers", resources: ["customer"] },
  { label: "Orders", resources: ["order"] },
] as const;

export function groupStorefrontPermissions(catalog: ApiHeadlessStorefrontPermissionDefinition[]) {
  return permissionGroups.map((group) => ({
    ...group,
    permissions: catalog.filter((permission) =>
      group.resources.some((resource) => resource === permission.resource),
    ),
  }));
}
