import { GraphQLError } from "graphql";
import type { StorefrontPermission } from "@shopana/storefront-permissions";
import type { ContextStorefrontAccess } from "./storefrontAccessContext.js";

export {
  STOREFRONT_PERMISSIONS,
  STOREFRONT_PERMISSION_VALUES,
  isStorefrontPermission,
} from "@shopana/storefront-permissions";
export type { StorefrontPermission } from "@shopana/storefront-permissions";

export function requireStorefrontPermission(
  context: ContextStorefrontAccess | undefined,
  permission: StorefrontPermission,
): void {
  if (!context?.permissions.includes(permission)) {
    throw new GraphQLError("Storefront permission is required", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}
