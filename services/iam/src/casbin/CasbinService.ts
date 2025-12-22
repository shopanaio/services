import { newEnforcer, Enforcer, newModelFromString } from "casbin";
import pg from "casbin-pg-adapter";

// Handle CommonJS default export in ESM context
// @ts-expect-error
const PostgresAdapter = pg.default ?? pg;
import { CASBIN_MODEL_TEXT } from "../constants/rbac.js";

/**
 * CasbinService manages Casbin enforcers for multi-tenant authorization.
 *
 * TENANT ISOLATION STRATEGY:
 * - Each tenant gets its own Enforcer instance (cached in memory)
 * - Policies are filtered by tenantId when loading from DB
 * - tenantId is stored in DB (v4 for policies, v2 for groupings) but NOT in Casbin model
 * - Casbin model is simple: r = sub, obj, act | p = sub, obj, act, eft | g = _, _
 *
 * DB Storage format:
 * - Policies (ptype='p'): v0=role, v1=resource, v2=action, v3=effect, v4=tenantId
 * - Groupings (ptype='g'): v0=user, v1=role, v2=tenantId
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

    // Create model from string
    const model = newModelFromString(CASBIN_MODEL_TEXT);

    // Create enforcer with model only (no adapter - we manage persistence manually)
    const enforcer = await newEnforcer(model);

    // Disable auto-save - we manage persistence via direct adapter calls
    enforcer.enableAutoSave(false);

    // Load only policies for this tenant
    await this.loadFilteredPolicies(enforcer, tenantId);

    this.enforcers.set(tenantId, enforcer);
    return enforcer;
  }

  /**
   * Load policies filtered by tenant ID from database.
   *
   * Uses direct SQL query to filter at DB level, then adds to enforcer
   * without the tenantId field (since model doesn't include it).
   */
  private async loadFilteredPolicies(
    enforcer: Enforcer,
    tenantId: string
  ): Promise<void> {
    // Clear existing policies in enforcer
    enforcer.clearPolicy();

    // Load policies from adapter (loads ALL policies)
    // We need to create a temporary enforcer with adapter to get raw data
    const model = newModelFromString(CASBIN_MODEL_TEXT);
    const tempEnforcer = await newEnforcer(model, this.adapter);
    await tempEnforcer.loadPolicy();

    // Get all rules from the model's internal storage
    // Policy rules: ptype='p', format in DB: [role, resource, action, effect, tenantId]
    // Grouping rules: ptype='g', format in DB: [user, role, tenantId]

    // Access the model's internal policy storage
    const policyRules = tempEnforcer.getModel().model.get("p")?.get("p")?.policy || [];
    const groupingRules = tempEnforcer.getModel().model.get("g")?.get("g")?.policy || [];

    // Filter and add policies for this tenant
    // DB format: [role, resource, action, effect, tenantId] - tenantId at index 4
    for (const rule of policyRules) {
      if (rule[4] === tenantId) {
        // Add to enforcer WITHOUT tenantId (model has 4 elements: sub, obj, act, eft)
        await enforcer.addPolicy(rule[0], rule[1], rule[2], rule[3]);
      }
    }

    // Filter and add groupings for this tenant
    // DB format: [user, role, tenantId] - tenantId at index 2
    for (const rule of groupingRules) {
      if (rule[2] === tenantId) {
        // Add to enforcer WITHOUT tenantId (model has 2 elements: _, _)
        await enforcer.addGroupingPolicy(rule[0], rule[1]);
      }
    }
  }

  /**
   * Check if user has permission
   *
   * @param tenantId - Tenant ID (used to get the right enforcer)
   * @param userId - User ID
   * @param resource - Resource name (e.g., "product", "order/*")
   * @param action - Action (e.g., "read", "write")
   */
  async enforce(
    tenantId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(tenantId);
    // Model: r = sub, obj, act (3 arguments, no domain)
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
   * Add a policy rule.
   *
   * Stores to DB with tenantId, adds to enforcer without tenantId.
   */
  async addPolicy(
    tenantId: string,
    role: string,
    resource: string,
    action: string,
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Persist to database WITH tenantId (5 elements: role, resource, action, effect, tenantId)
    try {
      await this.adapter.addPolicy("p", "p", [role, resource, action, effect, tenantId]);
    } catch (error: any) {
      // Ignore duplicate key errors - policy already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Add to enforcer memory WITHOUT tenantId (4 elements: sub, obj, act, eft)
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.addPolicy(role, resource, action, effect);
    return true;
  }

  /**
   * Remove a policy rule.
   */
  async removePolicy(
    tenantId: string,
    role: string,
    resource: string,
    action: string,
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Remove from database (5 elements including tenantId)
    await this.adapter.removePolicy("p", "p", [role, resource, action, effect, tenantId]);

    // Remove from enforcer memory (4 elements without tenantId)
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.removePolicy(role, resource, action, effect);
    return true;
  }

  /**
   * Remove all policies for a role in tenant
   */
  async removeFilteredPolicy(tenantId: string, role: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Remove from database - filter by role (v0) and tenantId (v4)
    await this.adapter.removeFilteredPolicy("p", "p", 0, role, "", "", "", tenantId);

    // Remove from enforcer memory - filter by role only (index 0)
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.removeFilteredPolicy(0, role);
    return true;
  }

  /**
   * Add user to role (grouping policy).
   *
   * Stores to DB with tenantId, adds to enforcer without tenantId.
   */
  async addRoleForUser(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Persist to database WITH tenantId (3 elements: user, role, tenantId)
    try {
      await this.adapter.addPolicy("g", "g", [userId, role, tenantId]);
    } catch (error: any) {
      // Ignore duplicate key errors - assignment already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Invalidate enforcer cache so next request loads fresh data from DB
    await this.invalidateEnforcer(tenantId);
    return true;
  }

  /**
   * Remove user from role
   */
  async removeRoleForUser(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Remove from database (3 elements including tenantId)
    await this.adapter.removePolicy("g", "g", [userId, role, tenantId]);

    // Invalidate enforcer cache so next request loads fresh data from DB
    await this.invalidateEnforcer(tenantId);
    return true;
  }

  /**
   * Get roles for a user in tenant.
   *
   * Since enforcer is tenant-isolated, no domain parameter needed.
   */
  async getRolesForUser(tenantId: string, userId: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);
    // Model: g = _, _ (no domain), so getRolesForUser takes only userId
    return enforcer.getRolesForUser(userId);
  }

  /**
   * Get all users with a specific role in tenant
   */
  async getUsersForRole(tenantId: string, role: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);
    // Model: g = _, _ (no domain)
    return enforcer.getUsersForRole(role);
  }

  /**
   * Add role hierarchy (parent inherits child permissions).
   *
   * Stores to DB with tenantId for filtering.
   */
  async addRoleHierarchy(
    tenantId: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Persist to database WITH tenantId
    try {
      await this.adapter.addPolicy("g", "g", [parentRole, childRole, tenantId]);
    } catch (error: any) {
      // Ignore duplicate key errors - hierarchy already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Add to enforcer memory WITHOUT tenantId
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.addGroupingPolicy(parentRole, childRole);
    return true;
  }

  /**
   * Get all policies for a tenant (4 elements: role, resource, action, effect)
   */
  async getPolicies(tenantId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(tenantId);
    return enforcer.getPolicy();
  }

  /**
   * Get all grouping policies for a tenant (2 elements: user/role, role)
   */
  async getGroupingPolicies(tenantId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(tenantId);
    return enforcer.getGroupingPolicy();
  }

  /**
   * Get roles that a role inherits from (role hierarchy).
   *
   * Returns the child roles that this role inherits permissions from.
   */
  async getRoleInherits(tenantId: string, roleName: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);
    const groupings = await enforcer.getGroupingPolicy();

    // Filter groupings where first element is the role (role inherits from another role)
    // Format in enforcer: [parentRole, childRole] (no tenantId)
    const inherits: string[] = [];
    for (const grouping of groupings) {
      if (grouping[0] === roleName) {
        inherits.push(grouping[1]);
      }
    }
    return inherits;
  }

  /**
   * Remove role hierarchy
   */
  async removeRoleHierarchy(
    tenantId: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Remove from database (3 elements including tenantId)
    await this.adapter.removePolicy("g", "g", [parentRole, childRole, tenantId]);

    // Invalidate enforcer cache so next request loads fresh data from DB
    await this.invalidateEnforcer(tenantId);
    return true;
  }

  /**
   * Remove all role hierarchy for a role (when updating inherits)
   */
  async removeAllRoleHierarchy(tenantId: string, roleName: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Remove all groupings where this role is the parent (inherits from others)
    // Filter: v0=roleName, v2=tenantId
    await this.adapter.removeFilteredPolicy("g", "g", 0, roleName, "", tenantId);

    // Invalidate enforcer cache
    await this.invalidateEnforcer(tenantId);
    return true;
  }
}
