import { eq, and, isNull } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import {
  organization,
  organizationMember,
  type Organization,
  type NewOrganization,
  type OrganizationMember,
  type NewOrganizationMember,
} from "../models/authorization.js";

export class OrganizationRepository {
  constructor(private readonly db: Database) {}

  // ============================================================================
  // Organization CRUD
  // ============================================================================

  async create(data: NewOrganization): Promise<Organization> {
    const [result] = await this.db.insert(organization).values(data).returning();
    return result;
  }

  async findById(id: string): Promise<Organization | null> {
    const result = await this.db
      .select()
      .from(organization)
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)))
      .limit(1);
    return result[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const result = await this.db
      .select()
      .from(organization)
      .where(and(eq(organization.slug, slug), isNull(organization.deletedAt)))
      .limit(1);
    return result[0] ?? null;
  }

  async update(id: string, data: Partial<NewOrganization>): Promise<Organization | null> {
    const [result] = await this.db
      .update(organization)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organization.id, id))
      .returning();
    return result ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(organization)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(organization.id, id))
      .returning();
    return result.length > 0;
  }

  // ============================================================================
  // Organization Members
  // ============================================================================

  async addMember(data: NewOrganizationMember): Promise<OrganizationMember> {
    const [result] = await this.db
      .insert(organizationMember)
      .values(data)
      .returning();
    return result;
  }

  async findMember(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    const result = await this.db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findMemberById(id: string): Promise<OrganizationMember | null> {
    const result = await this.db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async getMembersForOrg(organizationId: string): Promise<OrganizationMember[]> {
    return this.db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.organizationId, organizationId));
  }

  async getOrganizationsForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.db
      .select({
        organization: organization,
      })
      .from(organizationMember)
      .innerJoin(organization, eq(organizationMember.organizationId, organization.id))
      .where(
        and(
          eq(organizationMember.userId, userId),
          isNull(organization.deletedAt)
        )
      );
    return memberships.map((m) => m.organization);
  }

  async updateMember(
    id: string,
    data: Partial<NewOrganizationMember>
  ): Promise<OrganizationMember | null> {
    const [result] = await this.db
      .update(organizationMember)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizationMember.id, id))
      .returning();
    return result ?? null;
  }

  async removeMember(id: string): Promise<boolean> {
    const result = await this.db
      .delete(organizationMember)
      .where(eq(organizationMember.id, id))
      .returning();
    return result.length > 0;
  }

  async removeMemberByUserAndOrg(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async userHasAccessToOrg(userId: string, organizationId: string): Promise<boolean> {
    const member = await this.findMember(organizationId, userId);
    return member !== null;
  }

  async isOwner(userId: string, organizationId: string): Promise<boolean> {
    const member = await this.findMember(organizationId, userId);
    return member?.orgRole === "owner";
  }

  async isAdmin(userId: string, organizationId: string): Promise<boolean> {
    const member = await this.findMember(organizationId, userId);
    return member?.orgRole === "owner" || member?.orgRole === "admin";
  }
}
