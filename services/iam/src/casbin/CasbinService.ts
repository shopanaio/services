import { newEnforcer, Enforcer, newModelFromString } from "casbin";
import pg from "casbin-pg-adapter";
import path from "path";

// Handle CommonJS default export in ESM context
// @ts-expect-error
const PostgresAdapter = pg.default ?? pg;
import { fileURLToPath } from "url";
import { CASBIN_MODEL_TEXT } from "../constants/rbac.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CasbinService manages Casbin enforcers for multi-tenant authorization.
 *
 * Uses filtered policies per tenant to ensure complete isolation.
 * Each tenant gets its own enforcer instance with only its policies loaded.
 */
export class CasbinService {
  private enforcers: Map<string, Enforcer> = new Map();
  private adapter: InstanceType<typeof PostgresAdapter> | null = null;
  private initialized = false;

  constructor(private readonly connectionString: string) {}

  /**
   * Initialize the PostgreSQL adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.adapter = await PostgresAdapter.newAdapter({
      connectionString: this.connectionString,
      schemaName: "iam",
      tableName: "casbin_rule",
    });

    this.initialized = true;
  }

  /**
   * Get enforcer for a specific tenant (with caching)
   */
  async getEnforcer(tenantId: string): Promise<Enforcer> {
    if (!this.initialized || !this.adapter) {
      throw new Error(
        "CasbinService not initialized. Call initialize() first."
      );
    }

    const cached = this.enforcers.get(tenantId);
    if (cached) {
      return cached;
    }

    // Create model from string (no file needed)
    const model = newModelFromString(CASBIN_MODEL_TEXT);

    // Create enforcer with model and adapter
    const enforcer = await newEnforcer(model, this.adapter);

    // Load only policies for this tenant (v4 = tenantId)
    await this.loadFilteredPolicies(enforcer, tenantId);

    this.enforcers.set(tenantId, enforcer);
    return enforcer;
  }

  /**
   * Load policies filtered by tenant ID
   */
  private async loadFilteredPolicies(
    enforcer: Enforcer,
    tenantId: string
  ): Promise<void> {
    // Clear existing policies
    enforcer.clearPolicy();

    // Load filtered policies (v4 = tenantId for policies, v2 = tenantId for groupings)
    await enforcer.loadFilteredPolicy({
      p: ["", "", "", "", tenantId], // p: sub, obj, act, eft, tenantId
      g: ["", "", tenantId], // g: user, role, tenantId
    });
  }

  /**
   * Check if user has permission
   */
  async enforce(
    tenantId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    return enforcer.enforce(userId, resource, action);
  }

  /**
   * Batch check permissions
   */
  async batchEnforce(
    tenantId: string,
    userId: string,
    requests: Array<{ resource: string; action: string }>
  ): Promise<boolean[]> {
    const enforcer = await this.getEnforcer(tenantId);
    const results: boolean[] = [];

    for (const req of requests) {
      results.push(await enforcer.enforce(userId, req.resource, req.action));
    }

    return results;
  }

  /**
   * Invalidate cached enforcer for tenant (call after policy changes)
   */
  async invalidateEnforcer(tenantId: string): Promise<void> {
    this.enforcers.delete(tenantId);
  }

  /**
   * Reload policies for a tenant
   */
  async reloadPolicies(tenantId: string): Promise<void> {
    const enforcer = this.enforcers.get(tenantId);
    if (enforcer) {
      await this.loadFilteredPolicies(enforcer, tenantId);
    }
  }

  /**
   * Add a policy rule
   */
  async addPolicy(
    tenantId: string,
    role: string,
    resource: string,
    action: string,
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    const added = await enforcer.addPolicy(
      role,
      resource,
      action,
      effect,
      tenantId
    );
    if (added) {
      await enforcer.savePolicy();
    }
    return added;
  }

  /**
   * Remove a policy rule
   */
  async removePolicy(
    tenantId: string,
    role: string,
    resource: string,
    action: string,
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    const removed = await enforcer.removePolicy(
      role,
      resource,
      action,
      effect,
      tenantId
    );
    if (removed) {
      await enforcer.savePolicy();
    }
    return removed;
  }

  /**
   * Remove all policies for a role in tenant
   */
  async removeFilteredPolicy(tenantId: string, role: string): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    // Remove policies where v0 (subject) = role and v4 (tenant) = tenantId
    const removed = await enforcer.removeFilteredPolicy(0, role);
    if (removed) {
      await enforcer.savePolicy();
    }
    return removed;
  }

  /**
   * Add user to role (grouping policy)
   */
  async addRoleForUser(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    const added = await enforcer.addGroupingPolicy(userId, role, tenantId);
    if (added) {
      await enforcer.savePolicy();
    }
    return added;
  }

  /**
   * Remove user from role
   */
  async removeRoleForUser(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    const removed = await enforcer.removeGroupingPolicy(userId, role, tenantId);
    if (removed) {
      await enforcer.savePolicy();
    }
    return removed;
  }

  /**
   * Get roles for a user in tenant
   */
  async getRolesForUser(tenantId: string, userId: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);
    // Get roles where user is assigned (g: userId, role, tenantId)
    const roles = await enforcer.getRolesForUser(userId, tenantId);
    return roles;
  }

  /**
   * Get all users with a specific role in tenant
   */
  async getUsersForRole(tenantId: string, role: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);
    return enforcer.getUsersForRole(role, tenantId);
  }

  /**
   * Add role hierarchy (parent inherits child permissions)
   */
  async addRoleHierarchy(
    tenantId: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    // In Casbin: g, parentRole, childRole, tenantId
    const added = await enforcer.addGroupingPolicy(
      parentRole,
      childRole,
      tenantId
    );
    if (added) {
      await enforcer.savePolicy();
    }
    return added;
  }

  /**
   * Get all policies for a tenant
   */
  async getPolicies(tenantId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(tenantId);
    return enforcer.getPolicy();
  }

  /**
   * Get all grouping policies (user-role assignments) for a tenant
   */
  async getGroupingPolicies(tenantId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(tenantId);
    return enforcer.getGroupingPolicy();
  }
}
