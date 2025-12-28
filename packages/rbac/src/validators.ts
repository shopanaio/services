/**
 * Zod validators for RBAC permissions
 */
import { z } from "zod";
import { Resources } from "./definitions.js";

// Build permission schemas dynamically from Resources
const buildPermissionSchemas = <T extends Record<string, { actions: readonly string[] }>>(resources: T) => {
  return Object.entries(resources).map(([resource, { actions }]) =>
    z.object({
      resource: z.literal(resource),
      actions: z.array(z.enum(actions as [string, ...string[]])).min(1),
    })
  );
};

const orgSchemas = buildPermissionSchemas(Resources.org);
const storeSchemas = buildPermissionSchemas(Resources.store);

const OrgPermissionSchema = z.discriminatedUnion("resource", orgSchemas as any);
const StorePermissionSchema = z.discriminatedUnion("resource", storeSchemas as any);

// Domain permissions validation
export const DomainPermissionsSchema = z.discriminatedUnion("domain", [
  z.object({
    domain: z.literal("org"),
    permissions: z.array(OrgPermissionSchema).min(1),
  }),
  z.object({
    domain: z.literal("store"),
    permissions: z.array(StorePermissionSchema).min(1),
  }),
]);

export type DomainPermissions = z.infer<typeof DomainPermissionsSchema>;
