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
const DomainPermissionsSchema = z.union([
  OrgDomainPermissionsSchema,
  StoreDomainPermissionsSchema,
]);

export type DomainPermissions = z.infer<typeof DomainPermissionsSchema>;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Validates domain permissions input
 * @param input - The input to validate
 * @returns Validation result with parsed data or errors
 */
export function validateDomainPermissions(input: unknown): ValidationResult<DomainPermissions> {
  const result = DomainPermissionsSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

// ============ Authorization Request Validation ============

/** All valid org resources */
export const OrgResources = Object.keys(Resources.org) as Array<keyof typeof Resources.org>;

/** All valid store resources */
export const StoreResources = Object.keys(Resources.store) as Array<keyof typeof Resources.store>;

/** All valid resources */
export const AllResources = [...OrgResources, ...StoreResources] as const;

/** Resource type */
export type ResourceName = (typeof AllResources)[number];

/** Get valid actions for a resource */
export function getActionsForResource(resource: ResourceName): readonly string[] {
  if (resource in Resources.org) {
    return Resources.org[resource as keyof typeof Resources.org].actions;
  }
  if (resource in Resources.store) {
    return Resources.store[resource as keyof typeof Resources.store].actions;
  }
  return [];
}

/** Authorization request input */
export interface AuthorizeInput {
  domain: string;
  resource: string;
  action: string;
}

/** Validated authorization request */
export interface ValidatedAuthorizeInput {
  domain: "org" | `store:${string}`;
  resource: ResourceName;
  action: string;
}

/**
 * Validates authorization request parameters.
 * Checks that:
 * - domain is valid ("org" or "store:uuid")
 * - resource is valid for the domain (org.* for org, store.* for store)
 * - action is valid for the resource
 */
export function validateAuthorizeInput(input: AuthorizeInput): ValidationResult<ValidatedAuthorizeInput> {
  const errors: string[] = [];
  const { domain, resource, action } = input;

  // Validate domain
  const isOrgDomain = domain === "org";
  const isStoreDomain = /^store:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)
    || domain === "store:*";

  if (!isOrgDomain && !isStoreDomain) {
    errors.push(`Invalid domain "${domain}". Must be "org" or "store:<uuid>"`);
  }

  // Validate resource exists
  const isOrgResource = resource in Resources.org;
  const isStoreResource = resource in Resources.store;

  if (!isOrgResource && !isStoreResource) {
    errors.push(`Invalid resource "${resource}". Valid resources: ${AllResources.join(", ")}`);
  }

  // Validate resource matches domain
  if (isOrgDomain && !isOrgResource && isStoreResource) {
    // Org domain can access store resources (org admin)
  } else if (isStoreDomain && isOrgResource) {
    errors.push(`Resource "${resource}" is not valid for store domain. Use store.* resources`);
  }

  // Validate action for resource
  if (isOrgResource || isStoreResource) {
    const validActions = getActionsForResource(resource as ResourceName);
    if (!validActions.includes(action)) {
      errors.push(`Invalid action "${action}" for resource "${resource}". Valid actions: ${validActions.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      domain: domain as "org" | `store:${string}`,
      resource: resource as ResourceName,
      action,
    },
  };
}
