import { eq, and, isNull } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import {
  organization,
  organizationMember,
  userRole,
  role,
  type Organization,
  type OrganizationMember,
  type UserRole,
  type Role,
} from "../models/authorization.js";
import { BaseRepository } from "../BaseRepository.js";

// ============================================================================
// Types
// ============================================================================

export interface OrganizationCreateInput {
  /** URL-friendly identifier (e.g., "my-org") */
  name: string;
  /** Human-readable display name (e.g., "My Organization") */
  displayName: string;
}

export interface OrganizationCreateResult {
  success: boolean;
  organization: Organization | null;
  error?: string;
}

export interface AddMemberInput {
  organizationId: string;
  userId: string;
  invitedBy?: string;
  /** Set to true for organization creator (owner) */
  isOwner?: boolean;
}

// ============================================================================
// Repository
// ============================================================================

/**
 * Repository for organization management.
 * Handles CRUD operations for organizations and organization members.
 */
export class OrganizationRepository extends BaseRepository {
  /**
   * Create a new organization
   */
  @Transactional()
  async create(
    input: OrganizationCreateInput
  ): Promise<OrganizationCreateResult> {
    const { name, displayName } = input;

    try {
      // Check if name already exists
      const existing = await this.findByName(name);
      if (existing) {
        return {
          success: false,
          organization: null,
          error: "Organization with this name already exists",
        };
      }

      const [result] = await this.connection
        .insert(organization)
        .values({
          name,
          displayName,
        })
        .returning();

      return {
        success: true,
        organization: result,
      };
    } catch (error) {
      return {
        success: false,
        organization: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create organization",
      };
    }
  }

  /**
   * Find organization by ID
   */
  @ReadOnly()
  async findById(id: string): Promise<Organization | null> {
    const [result] = await this.connection
      .select()
      .from(organization)
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)));

    return result ?? null;
  }

  /**
   * Find organization by name (URL-friendly identifier)
   */
  @ReadOnly()
  async findByName(name: string): Promise<Organization | null> {
    const [result] = await this.connection
      .select()
      .from(organization)
      .where(and(eq(organization.name, name), isNull(organization.deletedAt)));

    return result ?? null;
  }

  /**
   * Update organization
   */
  @Transactional()
  async update(
    id: string,
    updates: { name?: string; displayName?: string }
  ): Promise<Organization | null> {
    const [result] = await this.connection
      .update(organization)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)))
      .returning();

    return result ?? null;
  }

  /**
   * Soft delete organization
   */
  @Transactional()
  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .update(organization)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)))
      .returning({ id: organization.id });

    return result.length > 0;
  }

  // ============================================================================
  // Organization Members
  // ============================================================================

  /**
   * Add a member to organization
   */
  async addMember(input: AddMemberInput): Promise<OrganizationMember> {
    const { organizationId, userId, invitedBy, isOwner = false } = input;

    const [result] = await this.connection
      .insert(organizationMember)
      .values({
        organizationId,
        userId,
        invitedBy,
        isOwner,
      })
      .returning();

    return result;
  }

  /**
   * Find organization member
   */
  @ReadOnly()
  async findMember(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    const [result] = await this.connection
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      );

    return result ?? null;
  }

  /**
   * Get all members of an organization
   */
  @ReadOnly()
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    return this.connection
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.organizationId, organizationId));
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    const result = await this.connection
      .delete(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      )
      .returning({ id: organizationMember.id });

    return result.length > 0;
  }

  /**
   * Find the owner of an organization
   */
  @ReadOnly()
  async findOwner(organizationId: string): Promise<OrganizationMember | null> {
    const [result] = await this.connection
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.isOwner, true)
        )
      );

    return result ?? null;
  }

  /**
   * Check if user is owner of organization
   */
  @ReadOnly()
  async isOwner(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.findMember(organizationId, userId);
    return member?.isOwner ?? false;
  }

  /**
   * Transfer ownership to another member
   * - New owner must be an existing member
   * - Previous owner loses isOwner flag but keeps membership
   */
  @Transactional()
  async transferOwnership(
    organizationId: string,
    newOwnerId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Find current owner
    const currentOwner = await this.findOwner(organizationId);
    if (!currentOwner) {
      return { success: false, error: "Organization has no owner" };
    }

    // Find new owner member
    const newOwnerMember = await this.findMember(organizationId, newOwnerId);
    if (!newOwnerMember) {
      return {
        success: false,
        error: "New owner must be a member of the organization",
      };
    }

    // Remove owner flag from current owner
    await this.connection
      .update(organizationMember)
      .set({ isOwner: false, updatedAt: new Date() })
      .where(eq(organizationMember.id, currentOwner.id));

    // Set owner flag on new owner
    await this.connection
      .update(organizationMember)
      .set({ isOwner: true, updatedAt: new Date() })
      .where(eq(organizationMember.id, newOwnerMember.id));

    return { success: true };
  }

  /**
   * Get all organizations where user is a member
   */
  @ReadOnly()
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const members = await this.connection
      .select({
        organization: organization,
      })
      .from(organizationMember)
      .innerJoin(
        organization,
        eq(organizationMember.organizationId, organization.id)
      )
      .where(
        and(
          eq(organizationMember.userId, userId),
          isNull(organization.deletedAt)
        )
      );

    return members.map((m) => m.organization);
  }

  // ============================================================================
  // User Roles
  // ============================================================================

  /**
   * Find user role assignment by organization, user and domain
   */
  @ReadOnly()
  async findUserRole(
    organizationId: string,
    userId: string,
    domain: string
  ): Promise<UserRole | null> {
    const [result] = await this.connection
      .select()
      .from(userRole)
      .where(
        and(
          eq(userRole.organizationId, organizationId),
          eq(userRole.userId, userId),
          eq(userRole.domain, domain)
        )
      );

    return result ?? null;
  }

  /**
   * Get all user roles for a domain
   */
  @ReadOnly()
  async getUserRolesByDomain(
    organizationId: string,
    domain: string
  ): Promise<UserRole[]> {
    return this.connection
      .select()
      .from(userRole)
      .where(
        and(
          eq(userRole.organizationId, organizationId),
          eq(userRole.domain, domain)
        )
      );
  }

  /**
   * Create a user role assignment
   */
  @Transactional()
  async createUserRole(input: {
    organizationId: string;
    userId: string;
    roleId: string;
    domain: string;
    grantedBy?: string;
  }): Promise<UserRole> {
    const [result] = await this.connection
      .insert(userRole)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        roleId: input.roleId,
        domain: input.domain,
        grantedBy: input.grantedBy,
      })
      .returning();

    return result;
  }

  /**
   * Update user role assignment
   */
  @Transactional()
  async updateUserRole(
    userRoleId: string,
    newRoleId: string
  ): Promise<UserRole | null> {
    const [result] = await this.connection
      .update(userRole)
      .set({ roleId: newRoleId })
      .where(eq(userRole.id, userRoleId))
      .returning();

    return result ?? null;
  }

  /**
   * Delete user role assignment
   */
  @Transactional()
  async deleteUserRole(userRoleId: string): Promise<boolean> {
    const result = await this.connection
      .delete(userRole)
      .where(eq(userRole.id, userRoleId))
      .returning({ id: userRole.id });

    return result.length > 0;
  }

  // ============================================================================
  // Roles
  // ============================================================================

  /**
   * Create a new role
   */
  @Transactional()
  async createRole(input: {
    organizationId: string;
    domain: string;
    name: string;
    displayName?: string;
    description?: string;
    isSystem?: boolean;
  }): Promise<Role> {
    const [result] = await this.connection
      .insert(role)
      .values({
        organizationId: input.organizationId,
        domain: input.domain,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        isSystem: input.isSystem ?? false,
      })
      .returning();

    return result;
  }

  /**
   * Create multiple roles
   */
  @Transactional()
  async createRoles(
    inputs: Array<{
      organizationId: string;
      domain: string;
      name: string;
      displayName?: string;
      description?: string;
      isSystem?: boolean;
    }>
  ): Promise<Role[]> {
    if (inputs.length === 0) {
      return [];
    }

    return this.connection
      .insert(role)
      .values(
        inputs.map((input) => ({
          organizationId: input.organizationId,
          domain: input.domain,
          name: input.name,
          displayName: input.displayName,
          description: input.description,
          isSystem: input.isSystem ?? false,
        }))
      )
      .returning();
  }

  /**
   * Find role by organization, domain and name
   */
  @ReadOnly()
  async findRole(
    organizationId: string,
    domain: string,
    name: string
  ): Promise<Role | null> {
    const [result] = await this.connection
      .select()
      .from(role)
      .where(
        and(
          eq(role.organizationId, organizationId),
          eq(role.domain, domain),
          eq(role.name, name)
        )
      );

    return result ?? null;
  }

  /**
   * Get all roles for a domain
   */
  @ReadOnly()
  async getRolesByDomain(
    organizationId: string,
    domain: string
  ): Promise<Role[]> {
    return this.connection
      .select()
      .from(role)
      .where(
        and(eq(role.organizationId, organizationId), eq(role.domain, domain))
      );
  }

  /**
   * Find role by ID
   */
  @ReadOnly()
  async findRoleById(
    organizationId: string,
    roleId: string
  ): Promise<Role | null> {
    const [result] = await this.connection
      .select()
      .from(role)
      .where(and(eq(role.organizationId, organizationId), eq(role.id, roleId)));

    return result ?? null;
  }

  /**
   * Update role
   */
  @Transactional()
  async updateRole(
    organizationId: string,
    roleId: string,
    updates: {
      displayName?: string;
      description?: string;
    }
  ): Promise<Role | null> {
    const [result] = await this.connection
      .update(role)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(role.organizationId, organizationId), eq(role.id, roleId)))
      .returning();

    return result ?? null;
  }

  /**
   * Delete role
   */
  @Transactional()
  async deleteRole(
    organizationId: string,
    roleId: string
  ): Promise<{ name: string } | null> {
    const [result] = await this.connection
      .delete(role)
      .where(and(eq(role.organizationId, organizationId), eq(role.id, roleId)))
      .returning({ name: role.name });

    return result ?? null;
  }
}
