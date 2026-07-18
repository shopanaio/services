import { and, eq } from "drizzle-orm";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  applicationMember,
  type ApplicationMember,
  type ApplicationMemberStatus,
} from "../models/authorization.js";

export interface AddApplicationMemberInput {
  applicationId: string;
  userId: string;
}

/**
 * Repository for linking global Better Auth users to IAM applications.
 * Authentication data and the user profile remain in the global auth tables.
 */
export class ApplicationMemberRepository extends BaseRepository {
  /**
   * Add a user to an application without changing an existing membership.
   * In particular, signing in must not reactivate a blocked member.
   */
  @Transactional()
  async add(input: AddApplicationMemberInput): Promise<ApplicationMember> {
    const [created] = await this.connection
      .insert(applicationMember)
      .values(input)
      .onConflictDoNothing({
        target: [applicationMember.applicationId, applicationMember.userId],
      })
      .returning();

    if (created) return created;

    const existing = await this.find(input.applicationId, input.userId);
    if (!existing) {
      throw new Error("Failed to create application membership");
    }

    return existing;
  }

  @ReadOnly()
  async find(
    applicationId: string,
    userId: string
  ): Promise<ApplicationMember | null> {
    const [result] = await this.connection
      .select()
      .from(applicationMember)
      .where(
        and(
          eq(applicationMember.applicationId, applicationId),
          eq(applicationMember.userId, userId)
        )
      )
      .limit(1);

    return result ?? null;
  }

  @ReadOnly()
  async isActive(applicationId: string, userId: string): Promise<boolean> {
    const member = await this.find(applicationId, userId);
    return member?.status === "active";
  }

  @ReadOnly()
  async getByApplication(applicationId: string): Promise<ApplicationMember[]> {
    return this.connection
      .select()
      .from(applicationMember)
      .where(eq(applicationMember.applicationId, applicationId));
  }

  @ReadOnly()
  async getByUser(userId: string): Promise<ApplicationMember[]> {
    return this.connection
      .select()
      .from(applicationMember)
      .where(eq(applicationMember.userId, userId));
  }

  @Transactional()
  async setStatus(
    applicationId: string,
    userId: string,
    status: ApplicationMemberStatus
  ): Promise<ApplicationMember | null> {
    const [result] = await this.connection
      .update(applicationMember)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(applicationMember.applicationId, applicationId),
          eq(applicationMember.userId, userId)
        )
      )
      .returning();

    return result ?? null;
  }

  @Transactional()
  async remove(applicationId: string, userId: string): Promise<boolean> {
    const result = await this.connection
      .delete(applicationMember)
      .where(
        and(
          eq(applicationMember.applicationId, applicationId),
          eq(applicationMember.userId, userId)
        )
      )
      .returning({ id: applicationMember.id });

    return result.length > 0;
  }
}
