import { newEnforcer, Enforcer, newModelFromString, Util } from "casbin";
import DrizzleAdapterModule from "drizzle-adapter";

// Handle CJS/ESM interop - drizzle-adapter is CJS with exports.default
const DrizzleAdapter = (DrizzleAdapterModule as any).default ?? DrizzleAdapterModule;
import { CASBIN_MODEL_TEXT } from "../constants/rbac.js";
import { casbinRule } from "../repositories/models/authorization.js";
import type { Database } from "../db/database.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Domain scope - single scope in format "type:id" or "type:*"
 *
 * Used for domain (no "/" separator):
 * - "org:uuid" - specific organization
 * - "org:*" - all organizations
 * - "store:uuid" - specific store
 * - "store:*" - all stores
 *
 * Examples:
 * - "org:550e8400-e29b-41d4-a716-446655440000"
 * - "store:*"
 */
export type Domain = `${string}:${string}`;

/**
 * Resource scope - one or more scopes joined by "/" or global wildcard
 *
 * Used for resources (supports "/" separator):
 * - "*" - global wildcard (matches everything)
 * - "product:*" - all products
 * - "product:123" - specific product
 * - "warehouse:123/product:*" - all products in warehouse 123
 * - "warehouse:*/product:*" - all products in all warehouses
 *
 * Examples:
 * - "*"
 * - "product:550e8400-e29b-41d4-a716-446655440000"
 * - "warehouse:W1/product:*"
 */
export type Resource = "*" | `${string}:${string}` | `${string}:${string}/${string}`;

export interface EnforceParams {
  organizationId: string;
  userId: string;
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
  effect?: "allow" | "deny";
}

export interface GetMembersParams {
  organizationId: string;
  domain: Domain;
}

/**
 * CasbinService manages Casbin enforcers for multi-organization authorization.
 *
 * ORGANIZATION + DOMAIN ISOLATION STRATEGY:
 * - Each organization gets its own Enforcer instance (cached in memory)
 * - Policies are filtered by organizationId when loading from DB
 * - Domain is required and must use format "prefix:id" (e.g., "org:uuid", "store:uuid")
 *
 * Casbin Model (4 parameters):
 * - Request: (sub, dom, obj, act) - subject, domain, object, action
 * - Policy: (sub, dom, obj, act, eft) - with effect
 * - Grouping: (user, role, domain) - user has role in domain
 *
 * Domain format:
 * - "org:{orgId}" - organization-level resources (billing, members, settings)
 * - "store:{storeId}" - store-level resources (products, orders)
 * - "org:*" or "store:*" - wildcard for all orgs/stores (uses keyMatch)
 *
 * DB Storage format (iam.casbin_rule):
 * - Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action, v4=effect, organization_id
 * - Groupings (ptype='g'): v0=user, v1=role, v2=domain, organization_id
 */
export class CasbinService {
  private enforcers: Map<string, Enforcer> = new Map();
  private adapter: InstanceType<typeof DrizzleAdapter> | null = null;
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

    // Enable domain pattern matching (e.g., "store:*" matches "store:123")
    await enforcer.addNamedDomainMatchingFunc("g", Util.keyMatchFunc);

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
    // New format with domain:
    // Policy rules: ptype='p', format in DB: [role, domain, resource, action, effect, orgId]
    // Grouping rules: ptype='g', format in DB: [user, role, domain, orgId]

    const policyRules = tempEnforcer.getModel().model.get("p")?.get("p")?.policy || [];
    const groupingRules = tempEnforcer.getModel().model.get("g")?.get("g")?.policy || [];

    // Filter and add policies for this organization
    // DB format: [role, domain, resource, action, effect, orgId] - orgId at index 5
    for (const rule of policyRules) {
      if (rule[5] === organizationId) {
        // Add to enforcer WITHOUT orgId (model has 5 elements: sub, dom, obj, act, eft)
        await enforcer.addPolicy(rule[0], rule[1], rule[2], rule[3], rule[4]);
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
  async removeFilteredPolicy(params: { organizationId: string; role: string }): Promise<boolean> {
    const { organizationId, role } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    await this.adapter.removeFilteredPolicy("p", "p", 0, role, "", "", "", "", organizationId);

    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.removeFilteredPolicy(0, role);
    return true;
  }

  // ============================================================================
  // Primary API
  // ============================================================================

  /**
   * Check if user has permission for action on resource in domain.
   */
  async enforce(params: EnforceParams): Promise<boolean> {
    const { organizationId, userId, domain, resource, action } = params;
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.enforce(`user:${userId}`, domain, resource, action);
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
  async removeAllRolesInDomain(params: Omit<AssignRoleParams, "role">): Promise<boolean> {
    const { organizationId, userId, domain } = params;
    const enforcer = await this.getEnforcer(organizationId);
    const groupings = await enforcer.getGroupingPolicy();
    const userPrefix = `user:${userId}`;

    for (const grouping of groupings) {
      if (grouping[0] === userPrefix && grouping[2] === domain) {
        await this.removeRole({ organizationId, userId, role: grouping[1], domain });
      }
    }

    return true;
  }

  /**
   * Add a policy rule.
   */
  async addPolicy(params: AddPolicyParams): Promise<boolean> {
    const { organizationId, role, domain, resource, action, effect = "allow" } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    try {
      await this.adapter.addPolicy("p", "p", [
        role,
        domain,
        resource,
        action,
        effect,
        organizationId,
      ]);
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
      return false;
    }

    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.addPolicy(role, domain, resource, action, effect);
    return true;
  }

  /**
   * Remove a policy rule.
   */
  async removePolicy(params: AddPolicyParams): Promise<boolean> {
    const { organizationId, role, domain, resource, action, effect = "allow" } = params;

    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    await this.adapter.removePolicy("p", "p", [
      role,
      domain,
      resource,
      action,
      effect,
      organizationId,
    ]);

    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.removePolicy(role, domain, resource, action, effect);
    return true;
  }

  /**
   * Get members for specific domain.
   */
  async getMembers(params: GetMembersParams): Promise<Array<{ userId: string; role: string }>> {
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
   * Get all grouping policies for an organization.
   */
  async getGroupingPolicies(organizationId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.getGroupingPolicy();
  }
}
