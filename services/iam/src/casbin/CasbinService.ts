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

    // Disable auto-save - we manage persistence manually via adapter
    // This is required because filtered enforcers cannot use savePolicy()
    enforcer.enableAutoSave(false);

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

    // Load all policies from database
    await enforcer.loadPolicy();

    // Get all policies and filter by tenantId
    let allPolicies: string[][] = [];
    let allGroupings: string[][] = [];

    try {
      allPolicies = (await enforcer.getPolicy()) || [];
      allGroupings = (await enforcer.getGroupingPolicy()) || [];
    } catch (e) {
      console.error(`[CasbinService.loadFilteredPolicies] Error getting policies:`, e);
      allPolicies = [];
      allGroupings = [];
    }

    console.log(`[CasbinService.loadFilteredPolicies] tenantId=${tenantId}, allPolicies=${allPolicies.length}, allGroupings=${allGroupings.length}`);

    // Clear and re-add only policies for this tenant
    enforcer.clearPolicy();

    // Add filtered policies (v4 = tenantId)
    for (const policy of allPolicies) {
      if (policy[4] === tenantId) {
        await enforcer.addPolicy(...policy);
      }
    }

    // Add filtered groupings (v2 = tenantId) - add all 3 elements (user, role, tenantId)
    for (const grouping of allGroupings) {
      if (grouping[2] === tenantId) {
        await enforcer.addGroupingPolicy(grouping[0], grouping[1], grouping[2]);
      }
    }

    const filteredPolicies = (await enforcer.getPolicy()) || [];
    const filteredGroupings = (await enforcer.getGroupingPolicy()) || [];
    console.log(`[CasbinService.loadFilteredPolicies] filtered: policies=${filteredPolicies.length}, groupings=${filteredGroupings.length}`);
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
    // Pass domain (tenantId) as 4th argument for domain-based RBAC
    return enforcer.enforce(userId, resource, action, tenantId);
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
      results.push(await enforcer.enforce(userId, req.resource, req.action, tenantId));
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
   * Note: Saves to DB first, then adds to enforcer memory
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

    // First persist to database
    try {
      await this.adapter.addPolicy("p", "p", [role, resource, action, effect, tenantId]);
    } catch (error: any) {
      // Ignore duplicate key errors - policy already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Then add to enforcer memory
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.addPolicy(role, resource, action, effect, tenantId);
    return true;
  }

  /**
   * Remove a policy rule
   * Note: Removes from DB first, then from enforcer memory
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

    // First remove from database
    await this.adapter.removePolicy("p", "p", [role, resource, action, effect, tenantId]);

    // Then remove from enforcer memory
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.removePolicy(role, resource, action, effect, tenantId);
    return true;
  }

  /**
   * Remove all policies for a role in tenant
   * Note: Removes from DB first, then from enforcer memory
   */
  async removeFilteredPolicy(tenantId: string, role: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // First remove from database - filter by role (v0) and tenantId (v4)
    await this.adapter.removeFilteredPolicy("p", "p", 0, role, "", "", "", tenantId);

    // Then remove from enforcer memory
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.removeFilteredPolicy(0, role);
    return true;
  }

  /**
   * Add user to role (grouping policy)
   * Note: Saves to DB first, then invalidates enforcer cache
   */
  async addRoleForUser(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // First persist to database
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
   * Note: Removes from DB first, then invalidates enforcer cache
   */
  async removeRoleForUser(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // First remove from database
    await this.adapter.removePolicy("g", "g", [userId, role, tenantId]);

    // Invalidate enforcer cache so next request loads fresh data from DB
    await this.invalidateEnforcer(tenantId);
    return true;
  }

  /**
   * Get roles for a user in tenant
   */
  async getRolesForUser(tenantId: string, userId: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);

    // Debug: show all groupings in enforcer
    const allGroupings = await enforcer.getGroupingPolicy();
    console.log(`[CasbinService.getRolesForUser] tenantId=${tenantId}, userId=${userId}`);
    console.log(`[CasbinService.getRolesForUser] All groupings in enforcer:`, JSON.stringify(allGroupings));

    // Get roles where user is assigned (g: userId, role, domain)
    const roles = await enforcer.getRolesForUser(userId, tenantId);
    console.log(`[CasbinService.getRolesForUser] Result roles:`, roles);
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
   * Note: Saves to DB first, then adds to enforcer memory
   */
  async addRoleHierarchy(
    tenantId: string,
    parentRole: string,
    childRole: string
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // First persist to database
    try {
      await this.adapter.addPolicy("g", "g", [parentRole, childRole, tenantId]);
    } catch (error: any) {
      // Ignore duplicate key errors - hierarchy already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Then add to enforcer memory with domain
    const enforcer = await this.getEnforcer(tenantId);
    await enforcer.addGroupingPolicy(parentRole, childRole, tenantId);
    return true;
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

  /**
   * Get roles that a role inherits from (role hierarchy)
   * Returns the parent roles that this role inherits permissions from
   */
  async getRoleInherits(tenantId: string, roleName: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(tenantId);
    const groupings = await enforcer.getGroupingPolicy();

    // Filter groupings where first element is the role (role inherits from another role)
    // Format: [parentRole, childRole, tenantId]
    const inherits: string[] = [];
    for (const grouping of groupings) {
      if (grouping[0] === roleName && grouping[2] === tenantId) {
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

    // First remove from database
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
    await this.adapter.removeFilteredPolicy("g", "g", 0, roleName, "", tenantId);

    // Invalidate enforcer cache
    await this.invalidateEnforcer(tenantId);
    return true;
  }
}
