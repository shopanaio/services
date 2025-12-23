import { eq, and } from "drizzle-orm";
import { role } from "../models/authorization.js";
import type { Database } from "../../db/database.js";
import type { Role, NewRole } from "../models/authorization.js";

export interface CreateRoleInput {
  organizationId: string;
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
  async findByTenant(organizationId: string): Promise<Role[]> {
    return this.db
      .select()
      .from(role)
      .where(eq(role.organizationId, organizationId));
  }

  /**
   * Find a role by name within a tenant
   */
  async findByName(organizationId: string, name: string): Promise<Role | null> {
    const [result] = await this.db
      .select()
      .from(role)
      .where(and(eq(role.organizationId, organizationId), eq(role.name, name)));
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
    const now = new Date();
    const [result] = await this.db
      .insert(role)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        displayName: input.displayName ?? input.name,
        description: input.description ?? "",
        isSystem: input.isSystem ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result;
  }

  /**
   * Update a role
   */
  async update(
    organizationId: string,
    name: string,
    updates: UpdateRoleInput
  ): Promise<Role | null> {
    const [result] = await this.db
      .update(role)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(role.organizationId, organizationId), eq(role.name, name)))
      .returning();
    return result ?? null;
  }

  /**
   * Delete a role by name
   */
  async delete(organizationId: string, name: string): Promise<boolean> {
    const result = await this.db
      .delete(role)
      .where(and(eq(role.organizationId, organizationId), eq(role.name, name)));
    return true;
  }

  /**
   * Delete all roles for a tenant
   */
  async deleteByTenant(organizationId: string): Promise<void> {
    await this.db.delete(role).where(eq(role.organizationId, organizationId));
  }

  /**
   * Check if role exists
   */
  async exists(organizationId: string, name: string): Promise<boolean> {
    const result = await this.findByName(organizationId, name);
    return result !== null;
  }
}
