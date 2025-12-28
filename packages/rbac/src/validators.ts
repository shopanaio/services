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

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Store domain format: store:<uuid>
const StoreDomainSchema = z.string().regex(/^store:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
  message: "Store domain must be in format 'store:<uuid>'",
});

// Org permissions schema
const OrgDomainPermissionsSchema = z.object({
  domain: z.literal("org"),
  permissions: z.array(OrgPermissionSchema).min(1),
});

// Store permissions schema
const StoreDomainPermissionsSchema = z.object({
  domain: StoreDomainSchema,
  permissions: z.array(StorePermissionSchema).min(1),
});

// Domain permissions validation
export const DomainPermissionsSchema = z.union([
  OrgDomainPermissionsSchema,
  StoreDomainPermissionsSchema,
]);

export type DomainPermissions = z.infer<typeof DomainPermissionsSchema>;
