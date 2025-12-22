import { eq, and } from "drizzle-orm";
import { role } from "../../db/schema/authorization.js";
import type { Database } from "../../db/database.js";
import type { Role, NewRole } from "../../db/schema/authorization.js";

export interface CreateRoleInput {
  tenantId: string;
  name: string;
  displayName?: string;
  description?: string;
  isSystem?: boolean;
}

export interface UpdateRoleInput {
  displayName?: string;
  description?: string;
}

/**
 * Repository for managing roles in PostgreSQL
 */
export class RoleRepository {
  constructor(private readonly db: Database) {}

  /**
   * Find all roles for a tenant
   */
  async findByTenant(tenantId: string): Promise<Role[]> {
    return this.db
      .select()
      .from(role)
      .where(eq(role.tenantId, tenantId));
  }

  /**
   * Find a role by name within a tenant
   */
  async findByName(tenantId: string, name: string): Promise<Role | null> {
    const [result] = await this.db
      .select()
      .from(role)
      .where(and(eq(role.tenantId, tenantId), eq(role.name, name)));
    return result ?? null;
  }

  /**
   * Find a role by ID
   */
  async findById(roleId: string): Promise<Role | null> {
    const [result] = await this.db
      .select()
      .from(role)
      .where(eq(role.id, roleId));
    return result ?? null;
  }

  /**
   * Create a new role
   */
  async create(input: CreateRoleInput): Promise<Role> {
    const [result] = await this.db
      .insert(role)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        displayName: input.displayName ?? input.name,
        description: input.description ?? "",
        isSystem: input.isSystem ?? false,
      })
      .returning();
    return result;
  }

  /**
   * Update a role
   */
  async update(
    tenantId: string,
    name: string,
    updates: UpdateRoleInput
  ): Promise<Role | null> {
    const [result] = await this.db
      .update(role)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(role.tenantId, tenantId), eq(role.name, name)))
      .returning();
    return result ?? null;
  }

  /**
   * Delete a role by name
   */
  async delete(tenantId: string, name: string): Promise<boolean> {
    const result = await this.db
      .delete(role)
      .where(and(eq(role.tenantId, tenantId), eq(role.name, name)));
    return true;
  }

  /**
   * Delete all roles for a tenant
   */
  async deleteByTenant(tenantId: string): Promise<void> {
    await this.db.delete(role).where(eq(role.tenantId, tenantId));
  }

  /**
   * Check if role exists
   */
  async exists(tenantId: string, name: string): Promise<boolean> {
    const result = await this.findByName(tenantId, name);
    return result !== null;
  }
}
