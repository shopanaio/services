import { newEnforcer, Enforcer, newModelFromString } from "casbin";
import DrizzleAdapter from "drizzle-adapter";
import { CASBIN_MODEL_TEXT } from "../constants/rbac.js";
import { casbinRule } from "../repositories/models/authorization.js";
import type { Database } from "../db/database.js";

/**
 * Shared type for scope parts - with or without ID
 */
export type ScopePart =
  | [type: string]              // type only: ["product"] - for create/list
  | [type: string, id: string]; // type + id: ["product", "123"] - for read/update/delete

/**
 * CasbinService manages Casbin enforcers for multi-organization authorization.
 *
 * ORGANIZATION + DOMAIN ISOLATION STRATEGY:
 * - Each organization gets its own Enforcer instance (cached in memory)
 * - Policies are filtered by organizationId when loading from DB
 * - Domain (project scope) is part of the Casbin model for per-project roles
 *
 * New Casbin Model (4 parameters):
 * - Request: (sub, dom, obj, act) - subject, domain, object, action
 * - Policy: (sub, dom, obj, act, eft) - with effect
 * - Grouping: (user, role, domain) - user has role in domain
 *
 * DB Storage format (iam.casbin_rule):
 * - Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action, v4=effect, organization_id
 * - Groupings (ptype='g'): v0=user, v1=role, v2=domain, organization_id
 */
export class CasbinService {
  private enforcers: Map<string, Enforcer> = new Map();
  private adapter: DrizzleAdapter | null = null;
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
   * Build path from typed parts (with or without ID)
   *
   * Examples:
   * - [["product"]] → "product"
   * - [["product", "456"]] → "product:456"
   * - [["warehouse", "W1"], ["product"]] → "warehouse:W1/product"
   * - [["warehouse", "W1"], ["product", "456"]] → "warehouse:W1/product:456"
   * - [] → "*"
   */
  buildPath(parts: ScopePart[]): string {
    if (parts.length === 0) return "*";

    return parts.map(part =>
      part.length === 1
        ? part[0]                    // "product"
        : `${part[0]}:${part[1]}`    // "product:456"
    ).join("/");
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
   * Check if user has permission with domain (project) scope
   *
   * @param organizationId - Organization ID (used to get the right enforcer)
   * @param userId - User ID
   * @param domain - Domain scope (project path, e.g., [["project", "abc-123"]] or [] for all)
   * @param resource - Resource path (e.g., [["product", "456"]] or [["product"]])
   * @param action - Action (e.g., "read", "write", "create", "delete")
   */
  async enforce(
    organizationId: string,
    userId: string,
    domain: ScopePart[],
    resource: ScopePart[],
    action: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(organizationId);
    const domainPath = this.buildPath(domain);
    const resourcePath = this.buildPath(resource);

    return enforcer.enforce(`user:${userId}`, domainPath, resourcePath, action);
  }

  /**
   * Legacy enforce method for backward compatibility (no domain)
   * Uses "*" as domain (all projects)
   */
  async enforceLegacy(
    organizationId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.enforce(`user:${userId}`, "*", resource, action);
  }

  /**
   * Batch check permissions with domain
   */
  async batchEnforce(
    organizationId: string,
    userId: string,
    domain: ScopePart[],
    requests: Array<{ resource: ScopePart[]; action: string }>
  ): Promise<boolean[]> {
    const enforcer = await this.getEnforcer(organizationId);
    const domainPath = this.buildPath(domain);
    const results: boolean[] = [];

    for (const req of requests) {
      const resourcePath = this.buildPath(req.resource);
      results.push(
        await enforcer.enforce(`user:${userId}`, domainPath, resourcePath, req.action)
      );
    }

    return results;
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
   * Add a policy rule with domain support.
   *
   * Stores to DB with organizationId, adds to enforcer without organizationId.
   */
  async addPolicy(
    organizationId: string,
    role: string,
    domain: ScopePart[],
    resource: ScopePart[],
    action: string,
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    const domainPath = this.buildPath(domain);
    const resourcePath = this.buildPath(resource);

    // Persist to database WITH organizationId (6 elements)
    try {
      await this.adapter.addPolicy("p", "p", [
        role,
        domainPath,
        resourcePath,
        action,
        effect,
        organizationId
      ]);
    } catch (error: any) {
      // Ignore duplicate key errors - policy already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Add to enforcer memory WITHOUT organizationId (5 elements)
    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.addPolicy(role, domainPath, resourcePath, action, effect);
    return true;
  }

  /**
   * Remove a policy rule.
   */
  async removePolicy(
    organizationId: string,
    role: string,
    domain: ScopePart[],
    resource: ScopePart[],
    action: string,
    effect: "allow" | "deny" = "allow"
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    const domainPath = this.buildPath(domain);
    const resourcePath = this.buildPath(resource);

    // Remove from database (6 elements including organizationId)
    await this.adapter.removePolicy("p", "p", [
      role,
      domainPath,
      resourcePath,
      action,
      effect,
      organizationId
    ]);

    // Remove from enforcer memory (5 elements)
    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.removePolicy(role, domainPath, resourcePath, action, effect);
    return true;
  }

  /**
   * Remove all policies for a role in organization
   */
  async removeFilteredPolicy(organizationId: string, role: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    // Remove from database - filter by role (v0) and orgId (v5)
    await this.adapter.removeFilteredPolicy("p", "p", 0, role, "", "", "", "", organizationId);

    // Remove from enforcer memory - filter by role only (index 0)
    const enforcer = await this.getEnforcer(organizationId);
    await enforcer.removeFilteredPolicy(0, role);
    return true;
  }

  /**
   * Assign role to user in a specific domain (project).
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param role - Role name
   * @param domain - Domain scope (project path, or [] for all projects)
   */
  async assignRole(
    organizationId: string,
    userId: string,
    role: string,
    domain: ScopePart[]
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    const domainPath = this.buildPath(domain);

    // Persist to database WITH organizationId (4 elements)
    try {
      await this.adapter.addPolicy("g", "g", [
        `user:${userId}`,
        role,
        domainPath,
        organizationId
      ]);
    } catch (error: any) {
      // Ignore duplicate key errors - assignment already exists
      if (error?.code !== "23505") {
        throw error;
      }
      return false;
    }

    // Invalidate enforcer cache so next request loads fresh data from DB
    await this.invalidateEnforcer(organizationId);
    return true;
  }

  /**
   * Remove role from user in a specific domain.
   */
  async removeRole(
    organizationId: string,
    userId: string,
    role: string,
    domain: ScopePart[]
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error("Adapter not initialized");
    }

    const domainPath = this.buildPath(domain);

    // Remove from database (4 elements including organizationId)
    await this.adapter.removePolicy("g", "g", [
      `user:${userId}`,
      role,
      domainPath,
      organizationId
    ]);

    // Invalidate enforcer cache so next request loads fresh data from DB
    await this.invalidateEnforcer(organizationId);
    return true;
  }

  /**
   * Get all roles for a user across all domains in organization.
   */
  async getRolesForUser(
    organizationId: string,
    userId: string
  ): Promise<Array<{ role: string; domain: string }>> {
    const enforcer = await this.getEnforcer(organizationId);
    const groupings = await enforcer.getGroupingPolicy();

    const userPrefix = `user:${userId}`;
    const roles: Array<{ role: string; domain: string }> = [];

    for (const grouping of groupings) {
      if (grouping[0] === userPrefix) {
        roles.push({
          role: grouping[1],
          domain: grouping[2],
        });
      }
    }

    return roles;
  }

  /**
   * Get roles for user in a specific domain.
   */
  async getRolesForUserInDomain(
    organizationId: string,
    userId: string,
    domain: ScopePart[]
  ): Promise<string[]> {
    const enforcer = await this.getEnforcer(organizationId);
    const domainPath = this.buildPath(domain);

    // getRolesForUserInDomain is a casbin built-in for domain models
    return enforcer.getRolesForUserInDomain(`user:${userId}`, domainPath);
  }

  /**
   * Get all users with roles in a specific domain.
   */
  async getMembersForDomain(
    organizationId: string,
    domain: ScopePart[]
  ): Promise<Array<{ userId: string; role: string }>> {
    const enforcer = await this.getEnforcer(organizationId);
    const groupings = await enforcer.getGroupingPolicy();
    const domainPath = this.buildPath(domain);

    const members: Array<{ userId: string; role: string }> = [];

    for (const grouping of groupings) {
      // grouping: [user, role, domain]
      if (grouping[2] === domainPath || grouping[2] === "*") {
        // Extract userId from "user:xxx"
        const userId = grouping[0].startsWith("user:")
          ? grouping[0].substring(5)
          : grouping[0];
        members.push({
          userId,
          role: grouping[1],
        });
      }
    }

    return members;
  }

  /**
   * Get all users with a specific role in organization (any domain)
   */
  async getUsersForRole(organizationId: string, role: string): Promise<string[]> {
    const enforcer = await this.getEnforcer(organizationId);
    const groupings = await enforcer.getGroupingPolicy();

    const users: string[] = [];
    for (const grouping of groupings) {
      if (grouping[1] === role) {
        const userId = grouping[0].startsWith("user:")
          ? grouping[0].substring(5)
          : grouping[0];
        if (!users.includes(userId)) {
          users.push(userId);
        }
      }
    }

    return users;
  }

  /**
   * Get all policies for an organization (5 elements: role, domain, resource, action, effect)
   */
  async getPolicies(organizationId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.getPolicy();
  }

  /**
   * Get all grouping policies for an organization (3 elements: user/role, role, domain)
   */
  async getGroupingPolicies(organizationId: string): Promise<string[][]> {
    const enforcer = await this.getEnforcer(organizationId);
    return enforcer.getGroupingPolicy();
  }
}
