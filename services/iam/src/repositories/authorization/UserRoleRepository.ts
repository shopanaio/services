import { eq, and } from "drizzle-orm";
import { userRole, role } from "../models/authorization.js";
import type { Database } from "../../db/database.js";
import type { UserRole, NewUserRole } from "../models/authorization.js";

export interface CreateUserRoleInput {
  organizationId: string;
  userId: string;
  roleId: string;
  grantedBy?: string;
}

export interface TenantMember {
  userId: string;
  roleName: string;
  roleDisplayName: string | null;
  grantedBy: string | null;
  grantedAt: Date;
}

export interface UserTenantRole {
  organizationId: string;
  roleName: string;
  roleDisplayName: string | null;
}

/**
 * Repository for managing user-role assignments in PostgreSQL
 */
export class UserRoleRepository {
  constructor(private readonly db: Database) {}

  /**
   * Find user-role assignment for a specific user in a tenant
   */
  async findByTenantAndUser(
    organizationId: string,
    userId: string
  ): Promise<(UserRole & { role: { name: string; displayName: string | null } }) | null> {
    const [result] = await this.db
      .select({
        id: userRole.id,
        organizationId: userRole.organizationId,
        tenantId: userRole.tenantId,
        userId: userRole.userId,
        roleId: userRole.roleId,
        domain: userRole.domain,
        grantedBy: userRole.grantedBy,
        grantedAt: userRole.grantedAt,
        role: {
          name: role.name,
          displayName: role.displayName,
        },
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(and(eq(userRole.organizationId, organizationId), eq(userRole.userId, userId)));

    return result ?? null;
  }

  /**
   * Find all members of a tenant
   */
  async findByTenant(organizationId: string): Promise<TenantMember[]> {
    return this.db
      .select({
        userId: userRole.userId,
        roleName: role.name,
        roleDisplayName: role.displayName,
        grantedBy: userRole.grantedBy,
        grantedAt: userRole.grantedAt,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.organizationId, organizationId));
  }

  /**
   * Find all tenant roles for a user
   */
  async findByUser(userId: string): Promise<UserTenantRole[]> {
    return this.db
      .select({
        organizationId: userRole.organizationId,
        roleName: role.name,
        roleDisplayName: role.displayName,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, userId));
  }

  /**
   * Create or update user-role assignment (one role per user per tenant)
   */
  async upsert(input: CreateUserRoleInput): Promise<UserRole> {
    // Delete existing assignment if any
    await this.delete(input.organizationId, input.userId);

    // Insert new assignment
    const [result] = await this.db
      .insert(userRole)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        roleId: input.roleId,
        grantedBy: input.grantedBy,
      })
      .returning();

    return result;
  }

  /**
   * Delete user-role assignment
   */
  async delete(organizationId: string, userId: string): Promise<boolean> {
    await this.db
      .delete(userRole)
      .where(and(eq(userRole.organizationId, organizationId), eq(userRole.userId, userId)));
    return true;
  }

  /**
   * Delete all user-role assignments for a tenant
   */
  async deleteByTenant(organizationId: string): Promise<void> {
    await this.db.delete(userRole).where(eq(userRole.organizationId, organizationId));
  }

  /**
   * Delete all user-role assignments for a specific role
   */
  async deleteByRole(roleId: string): Promise<void> {
    await this.db.delete(userRole).where(eq(userRole.roleId, roleId));
  }

  /**
   * Check if user has a role in tenant
   */
  async hasRole(organizationId: string, userId: string): Promise<boolean> {
    const result = await this.findByTenantAndUser(organizationId, userId);
    return result !== null;
  }

  /**
   * Count members in a tenant
   */
  async countByTenant(organizationId: string): Promise<number> {
    const members = await this.findByTenant(organizationId);
    return members.length;
  }
}
