import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq } from "drizzle-orm";
import { assertApplicationId } from "../../auth/AuthScope.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  applicationMember,
  type ApplicationMember,
  type ApplicationMemberStatus,
} from "../models/application-member.js";

export interface AddApplicationMemberInput {
  userId: string;
}

/** Creates membership repositories bound to one mandatory application. */
export class ApplicationMemberRepositoryFactory {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  forApplication(applicationId: string): ApplicationMemberRepository {
    assertApplicationId(applicationId);
    return new ApplicationMemberRepository(
      this.db,
      this.txManager,
      applicationId
    );
  }
}

/** Repository for global-user membership within exactly one application. */
export class ApplicationMemberRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly applicationId: string
  ) {
    super(db, txManager);
    assertApplicationId(applicationId);
  }

  /**
   * Add a user without changing an existing membership.
   * In particular, signing in must not reactivate a blocked member.
   */
  @Transactional()
  async add(input: AddApplicationMemberInput): Promise<ApplicationMember> {
    const [created] = await this.connection
      .insert(applicationMember)
      .values({
        applicationId: this.applicationId,
        userId: input.userId,
      })
      .onConflictDoNothing({
        target: [applicationMember.applicationId, applicationMember.userId],
      })
      .returning();

    if (created) return created;

    const existing = await this.find(input.userId);
    if (!existing) {
      throw new Error("Failed to create application membership");
    }

    return existing;
  }

  @ReadOnly()
  async find(userId: string): Promise<ApplicationMember | null> {
    const [result] = await this.connection
      .select()
      .from(applicationMember)
      .where(
        and(
          eq(applicationMember.applicationId, this.applicationId),
          eq(applicationMember.userId, userId)
        )
      )
      .limit(1);

    return result ?? null;
  }

  @ReadOnly()
  async isActive(userId: string): Promise<boolean> {
    const member = await this.find(userId);
    return member?.status === "active";
  }

  @ReadOnly()
  async getAll(): Promise<ApplicationMember[]> {
    return this.connection
      .select()
      .from(applicationMember)
      .where(eq(applicationMember.applicationId, this.applicationId));
  }

  @Transactional()
  async setStatus(
    userId: string,
    status: ApplicationMemberStatus
  ): Promise<ApplicationMember | null> {
    const [result] = await this.connection
      .update(applicationMember)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(applicationMember.applicationId, this.applicationId),
          eq(applicationMember.userId, userId)
        )
      )
      .returning();

    return result ?? null;
  }

  @Transactional()
  async remove(userId: string): Promise<boolean> {
    const result = await this.connection
      .delete(applicationMember)
      .where(
        and(
          eq(applicationMember.applicationId, this.applicationId),
          eq(applicationMember.userId, userId)
        )
      )
      .returning({ id: applicationMember.id });

    return result.length > 0;
  }
}
