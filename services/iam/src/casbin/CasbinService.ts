import { newEnforcer, Enforcer, newModelFromString, Util } from "casbin";
import DrizzleAdapterModule from "drizzle-adapter";
import { eq } from "drizzle-orm";

const DrizzleAdapter = (DrizzleAdapterModule as any)
  .default as typeof DrizzleAdapterModule;

import { casbinRule } from "../repositories/models/authorization.js";
import type { Database } from "../infrastructure/db/database.js";

// ============================================================================
// Casbin Model
// ============================================================================

/**
 * Casbin Model for RBAC with Domain (Organization + Store scope)
 *
 * Each organization gets its own enforcer instance with filtered policies.
 * Domain parameter enables per-store role assignments within an organization.
 *
 * Request format: (sub, dom, obj, act)
 * - sub: subject (user ID, e.g., "user:uuid")
 * - dom: domain (required, format "prefix:id" or "prefix:*")
 * - obj: object (resource path, e.g., "org.profile", "store.members")
 * - act: action (read, write, admin)
 *
 * Action hierarchy (g2):
 *   read  ←  write  ←  admin
 * - "admin" includes "write" and "read"
 * - "write" includes "read"
 *
 * Policy format: (sub, dom, obj, act)
 * - No effect field - all policies are "allow" by default
 *
 * Grouping format:
 * - g (user, role, domain) - Assigns a user to a role within a specific domain
 * - g2 (action, action) - Action hierarchy (child inherits from parent)
 *
 * Features:
 * - keyMatch for wildcard matching in resources and domains
 * - Domain-scoped role assignments (user can be admin in one store, viewer in another)
 * - Action hierarchy via g2 grouping
 *
 * Database storage (iam.casbin_rule):
 * - Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action, v4=orgId
 * - Groupings (ptype='g'): v0=user, v1=role, v2=domain, v3=orgId
 */
const CASBIN_MODEL_TEXT = `
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && keyMatch(r.dom, p.dom) && keyMatch(r.obj, p.obj) && (r.act == p.act || g2(r.act, p.act))
`.trim();

/**
 * Action hierarchy for g2 grouping.
 * Format: [child, parent] - child action inherits from parent.
 * This means if you have "write" permission, you also have "read".
 */
const ACTION_HIERARCHY: [string, string][] = [
  ["read", "write"], // write includes read
  ["write", "admin"], // admin includes write (and transitively read)
];

// ============================================================================
// Authorization Types
// ============================================================================

/**
 * Scope identifier in format "type:id".
 * Used as a building block for Domain and Resource types.
 *
 * @example
 * "org:550e8400-e29b-41d4-a716-446655440000"
 * "product:*"
 */
export type ScopeIdentifier = `${string}:${string}`;

/**
 * Domain scope - identifies the context for authorization.
 *
 * @example
 * "org" - organization-level (constant, no ID needed)
 * "store:abc123" - specific store
 */
export type Domain = "org" | ScopeIdentifier;

/**
 * Organization domain constant.
 * Use this for organization-level roles and policies.
 * No need to include orgId since organization_id column already filters by org.
 */
export const ORG_DOMAIN: Domain = "org";

/**
 * Create a domain identifier from prefix and value.
 * @param prefix - The domain prefix (e.g., "org", "store")
 * @param value - The domain value (e.g., UUID or "*")
 * @returns Domain in format "prefix:value"
 */
export function createDomain(prefix: string, value: string): Domain {
  return `${prefix}:${value}`;
}

/**
 * Resource scope for authorization checks.
 *
 * Supports three formats:
 * - "*" - global wildcard (matches everything)
 * - "type:id" - single resource (e.g., "product:123", "product:*")
 * - "parent:id/child:id" - nested resource path (e.g., "warehouse:W1/product:*")
 *
 * @example
 * "*" - all resources
 * "product:550e8400-e29b-41d4-a716-446655440000" - specific product
 * "product:*" - all products
 * "warehouse:W1/product:*" - all products in warehouse W1
 */
/**
 * Resource types supported in policies:
 * - "*" - all resources (wildcard)
 * - "org.profile", "store.members" - dotted resource names from @shopana/rbac
 * - "product:uuid" - scoped identifiers
 * - "warehouse:W1/product:*" - nested paths
 */
export type Resource = string;
export interface EnforceParams {
  organizationId: string;
  subject: string;
  domain: Domain;
  resource: Resource;
  action: string;
}

export interface AssignRoleParams {
  organizationId: string;
  userId: string;
  role: string;
  domain: Domain;
}

export interface AddPolicyParams {
  organizationId: string;
  role: string;
  domain: Domain;
  resource: Resource;
  action: string;
}

export interface GetMembersParams {
  organizationId: string;
  domain: Domain;
}

export interface GroupedPermission {
  resource: string;
  actions: string[];
}

/**
 * CasbinService manages Casbin enforcers for multi-organization authorization.
 *
 * ORGANIZATION + DOMAIN ISOLATION STRATEGY:
 * - Each organization gets its own Enforcer instance (cached in memory)
 * - Policies are filtered by organizationId when loading from DB
 * - Domain is required and must use format "prefix:id" (e.g., "org:uuid", "store:uuid")
 *
 * Casbin Model:
 * - Request: (sub, dom, obj, act) - subject, domain, object, action
 * - Policy: (sub, dom, obj, act) - all policies are "allow" by default
 * - Grouping: (user, role, domain) - user has role in domain
 *
 * Domain format:
 * - "org" - organization-level resources (billing, members, settings)
 * - "store:{storeId}" - store-level resources (products, orders)
 *
 * DB Storage format (iam.casbin_rule):
 * - Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action, organization_id
 * - Groupings (ptype='g'): v0=user, v1=role, v2=domain, organization_id
 */
export class CasbinService {
  private enforcers: Map<string, Enforcer> = new Map();
  private adapter!: DrizzleAdapterModule;
  private initialized = false;

  constructor(private readonly db: Database) {}

  /**
   * Initialize the Drizzle adapter for Casbin
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Use type assertion because drizzle-adapter expects schema: undefined
    // but our table is in the 'iam' schema. The adapter works correctly regardless.
    this.adapter = await DrizzleAdapter.newAdapter({
      db: this.db as any,
      table: casbinRule as any,
    });

    this.initialized = true;
  }

  /**
   * Get enforcer for a specific organization (with caching)
   */
  async getEnforcer(organizationId: string): Promise<Enforcer> {
    if (!this.initialized || !this.adapter) {
      throw new Error(
        "CasbinService not initialized. Call initialize() first."
      );
    }

    const cached = this.enforcers.get(organizationId);
    if (cached) {
      return cached;
    }

    // Create model from string
    const model = newModelFromString(CASBIN_MODEL_TEXT);

    // Create enforcer with model only (no adapter - we manage persistence manually)
    const enforcer = await newEnforcer(model);

    // Disable auto-save - we manage persistence via direct adapter calls
    enforcer.enableAutoSave(false);

    // Enable domain pattern matching for keyMatch in policies
    await enforcer.addNamedDomainMatchingFunc("g", Util.keyMatchFunc);

    // Initialize action hierarchy (g2)
    // This enables: write includes read, admin includes write+read
    for (const [child, parent] of ACTION_HIERARCHY) {
      await enforcer.addNamedGroupingPolicy("g2", child, parent);
    }

    // Load only policies for this organization
    await this.loadFilteredPolicies(enforcer, organizationId);

    this.enforcers.set(organizationId, enforcer);
    return enforcer;
  }

  /**
   * Load policies filtered by organization ID from database.
   *
   * Uses direct SQL query to filter at DB level, then adds to enforcer
   * without the organizationId field (since model doesn't include it).
   */
  private async loadFilteredPolicies(
    enforcer: Enforcer,
    organizationId: string
  ): Promise<void> {
    // Clear existing policies in enforcer
    enforcer.clearPolicy();

    // Load policies from adapter (loads ALL policies)
    // We need to create a temporary enforcer with adapter to get raw data
    const model = newModelFromString(CASBIN_MODEL_TEXT);
    const tempEnforcer = await newEnforcer(model, this.adapter);
    await tempEnforcer.loadPolicy();

    // Get all rules from the model's internal storage
    // Policy rules: ptype='p', format in DB: [role, domain, resource, action, orgId]
    // Grouping rules: ptype='g', format in DB: [user, role, domain, orgId]

    const policyRules =
      tempEnforcer.getModel().model.get("p")?.get("p")?.policy || [];
    const groupingRules =
      tempEnforcer.getModel().model.get("g")?.get("g")?.policy || [];

    // Filter and add policies for this organization
    // DB format: [role, domain, resource, action, orgId] - orgId at index 4
    for (const rule of policyRules) {
      if (rule[4] === organizationId) {
        // Add to enforcer WITHOUT orgId (model has 4 elements: sub, dom, obj, act)
        await enforcer.addPolicy(rule[0], rule[1], rule[2], rule[3]);
      }
    }

    // Filter and add groupings for this organization
    // DB format: [user, role, domain, orgId] - orgId at index 3
    for (const rule of groupingRules) {
      if (rule[3] === organizationId) {
        // Add to enforcer WITHOUT orgId (model has 3 elements: _, _, _)
        await enforcer.addGroupingPolicy(rule[0], rule[1], rule[2]);
      }
    }
  }

  /**
   * Invalidate cached enforcer for organization (call after policy changes)
   */
  async invalidateEnforcer(organizationId: string): Promise<void> {
    this.enforcers.delete(organizationId);
  }

  /**
   * Reload policies for an organization
   */
  async reloadPolicies(organizationId: string): Promise<void> {
    const enforcer = this.enforcers.get(organizationId);
    if (enforcer) {
      await this.loadFilteredPolicies(enforcer, organizationId);
    }
  }

  /**
   * Remove all policies for a role in organization
   */
  async removeFilteredPolicy(params: {
    organizationId: string;
    role: string;
  }): Promise<boolean> {
    const { organizationId, role } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    await this.adapter.removeFilteredPolicy(
      "p",
      "p",
      0,
      role,
      "",
      "",
      "",
      "",
      organizationId
    );

    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.removeFilteredPolicy(0, role);
    return true;
  }

  // ============================================================================
  // Primary API
  // ============================================================================

  /**
   * Check if subject has permission for action on resource in domain.
   */
  async enforce(params: EnforceParams): Promise<boolean> {
    const { organizationId, subject, domain, resource, action } = params;
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.enforce(`user:${subject}`, domain, resource, action);
  }

  /**
   * Assign role to user in specific domain.
   */
  async assignRole(params: AssignRoleParams): Promise<boolean> {
    const { organizationId, userId, role, domain } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    try {
      await this.adapter.addPolicy("g", "g", [
        `user:${userId}`,
        role,
        domain,
        organizationId,
      ]);
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
      return false;
    }

    await this.invalidateEnforcer(organizationId);
    return true;
  }

  /**
   * Remove role from user in specific domain.
   */
  async removeRole(params: AssignRoleParams): Promise<boolean> {
    const { organizationId, userId, role, domain } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    await this.adapter.removePolicy("g", "g", [
      `user:${userId}`,
      role,
      domain,
      organizationId,
    ]);

    await this.invalidateEnforcer(organizationId);
    return true;
  }

  /**
   * Remove all roles for user in specific domain.
   */
  async removeAllRolesInDomain(
    params: Omit<AssignRoleParams, "role">
  ): Promise<boolean> {
    const { organizationId, userId, domain } = params;
    const enforcer = await this.getEnforcer(organizationId);
    const groupings = await enforcer.getGroupingPolicy();
    const userPrefix = `user:${userId}`;

    for (const grouping of groupings) {
      if (grouping[0] === userPrefix && grouping[2] === domain) {
        await this.removeRole({
          organizationId,
          userId,
          role: grouping[1],
          domain,
        });
      }
    }

    return true;
  }

  /**
   * Add a policy rule.
   */
  async addPolicy(params: AddPolicyParams): Promise<boolean> {
    const { organizationId, role, domain, resource, action } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    try {
      await this.adapter.addPolicy("p", "p", [
        role,
        domain,
        resource,
        action,
        organizationId,
      ]);
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
      return false;
    }

    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.addPolicy(role, domain, resource, action);
    return true;
  }

  /**
   * Remove a policy rule.
   */
  async removePolicy(params: AddPolicyParams): Promise<boolean> {
    const { organizationId, role, domain, resource, action } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    await this.adapter.removePolicy("p", "p", [
      role,
      domain,
      resource,
      action,
      organizationId,
    ]);

    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.removePolicy(role, domain, resource, action);
    return true;
  }

  /**
   * Remove all policies for a specific role in a domain.
   */
  async removeRolePolicies(params: {
    organizationId: string;
    role: string;
    domain: Domain;
  }): Promise<boolean> {
    const { organizationId, role, domain } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Get all policies for this role
    const policies = await this.getPoliciesForRole(organizationId, role);

    // Filter by domain and remove each one
    for (const policy of policies) {
      const [, policyDomain, resource, action] = policy;
      if (policyDomain === domain) {
        await this.adapter.removePolicy("p", "p", [
          role,
          domain,
          resource,
          action,
          organizationId,
        ]);
      }
    }

    // Also update enforcer
    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.loadPolicy();

    return true;
  }

  /**
   * Get members for specific domain.
   */
  async getMembers(
    params: GetMembersParams
  ): Promise<Array<{ userId: string; role: string }>> {
    const { organizationId, domain } = params;
    const enforcer = await this.getEnforcer(organizationId);
    const groupings = await enforcer.getGroupingPolicy();

    const members: Array<{ userId: string; role: string }> = [];

    for (const grouping of groupings) {
      if (grouping[2] === domain) {
        const userId = grouping[0].startsWith("user:")
          ? grouping[0].substring(5)
          : grouping[0];
        members.push({ userId, role: grouping[1] });
      }
    }

    return members;
  }

  /**
   * Get all policies for an organization.
   */
  async getPolicies(organizationId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.getPolicy();
  }

  /**
   * Get policies for a specific role in organization.
   * Policy format: [role, domain, resource, action]
   */
  async getPoliciesForRole(
    organizationId: string,
    role: string
  ): Promise<string[][]> {
    const enforcer = await this.getEnforcer(organizationId);
    // fieldIndex 0 = role field in policy tuple
    const ROLE_FIELD_INDEX = 0;
    return enforcer.getFilteredPolicy(ROLE_FIELD_INDEX, role);
  }

  /**
   * Get grouped policies for a role.
   * Aggregates policies by resource with actions as array.
   */
  async getGroupedPoliciesForRole(
    organizationId: string,
    role: string
  ): Promise<GroupedPermission[]> {
    const policies = await this.getPoliciesForRole(organizationId, role);

    const map = new Map<string, GroupedPermission>();

    for (const [, , resource, action] of policies) {
      const existing = map.get(resource);
      if (existing) {
        existing.actions.push(action);
      } else {
        map.set(resource, { resource, actions: [action] });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Get all grouping policies for an organization.
   */
  async getGroupingPolicies(organizationId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.getGroupingPolicy();
  }

  /**
   * Add multiple policies.
   * Much more efficient than calling addPolicy() multiple times.
   */
  async addPolicies(params: {
    organizationId: string;
    policies: Array<{
      role: string;
      domain: Domain;
      resource: Resource;
      action: string;
    }>;
  }): Promise<void> {
    const { organizationId, policies } = params;

    if (policies.length === 0) {
      return;
    }

    await this.adapter.addPolicies(
      "p",
      "p",
      policies.map((p) => [
        p.role,
        p.domain,
        p.resource,
        p.action,
        organizationId,
      ])
    );

    // Invalidate enforcer once at the end
    await this.invalidateEnforcer(organizationId);
  }

  /**
   * Batch check permissions for multiple requests.
   * More efficient than calling enforce() multiple times.
   *
   * @param organizationId - Organization to check in
   * @param requests - Array of {subject, domain, resource, action}
   * @returns Array of boolean results in same order as requests
   */
  async batchEnforce(params: {
    organizationId: string;
    requests: Array<{
      subject: string;
      domain: Domain;
      resource: Resource;
      action: string;
    }>;
  }): Promise<boolean[]> {
    const { organizationId, requests } = params;
    const enforcer = await this.getEnforcer(organizationId);

    // Convert to Casbin batch format: [[sub, dom, obj, act], ...]
    const casbinRequests = requests.map((req) => [
      `user:${req.subject}`,
      req.domain,
      req.resource,
      req.action,
    ]);

    return enforcer.batchEnforce(casbinRequests);
  }
}
