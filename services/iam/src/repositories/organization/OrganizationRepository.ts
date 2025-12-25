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
  name: string;
  slug: string;
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
  async create(input: OrganizationCreateInput): Promise<OrganizationCreateResult> {
    const { name, slug } = input;

    try {
      // Check if slug already exists
      const existing = await this.findBySlug(slug);
      if (existing) {
        return {
          success: false,
          organization: null,
          error: "Organization with this slug already exists",
        };
      }

      const [result] = await this.connection
        .insert(organization)
        .values({
          name,
          slug,
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
        error: error instanceof Error ? error.message : "Failed to create organization",
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
   * Find organization by slug
   */
  @ReadOnly()
  async findBySlug(slug: string): Promise<Organization | null> {
    const [result] = await this.connection
      .select()
      .from(organization)
      .where(and(eq(organization.slug, slug), isNull(organization.deletedAt)));

    return result ?? null;
  }

  /**
   * Update organization
   */
  @Transactional()
  async update(
    id: string,
    updates: { name?: string }
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
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)));

    return (result as any).rowCount > 0;
  }

  // ============================================================================
  // Organization Members
  // ============================================================================

  /**
   * Add a member to organization
   */
  @Transactional()
  async addMember(input: AddMemberInput): Promise<OrganizationMember | null> {
    const { organizationId, userId, invitedBy } = input;

    try {
      const [result] = await this.connection
        .insert(organizationMember)
        .values({
          organizationId,
          userId,
          invitedBy,
        })
        .returning();

      return result;
    } catch (error) {
      // Handle duplicate member error
      if ((error as any)?.code === "23505") {
        return null;
      }
      throw error;
    }
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
  @Transactional()
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    const result = await this.connection
      .delete(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      );

    return (result as any).rowCount > 0;
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
      .innerJoin(organization, eq(organizationMember.organizationId, organization.id))
      .where(
        and(eq(organizationMember.userId, userId), isNull(organization.deletedAt))
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
        and(
          eq(role.organizationId, organizationId),
          eq(role.domain, domain)
        )
      );
  }
}
