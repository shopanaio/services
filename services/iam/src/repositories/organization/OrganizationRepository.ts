import { eq, and, isNull } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import {
  organization,
  organizationMember,
  type Organization,
  type OrganizationMember,
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
}
