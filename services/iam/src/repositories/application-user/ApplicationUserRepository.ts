import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq } from "drizzle-orm";
import { assertApplicationId } from "../../auth/AuthScope.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  applicationSession,
  applicationUser,
  type ApplicationUser,
  type ApplicationUserStatus,
} from "../models/application-auth.js";

/** Creates application-user repositories bound to one mandatory application. */
export class ApplicationUserRepositoryFactory {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  forApplication(applicationId: string): ApplicationUserRepository {
    assertApplicationId(applicationId);
    return new ApplicationUserRepository(
      this.db,
      this.txManager,
      applicationId
    );
  }
}

/** Management repository for application-local authentication identities. */
export class ApplicationUserRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly applicationId: string
  ) {
    super(db, txManager);
    assertApplicationId(applicationId);
  }

  @ReadOnly()
  async find(userId: string): Promise<ApplicationUser | null> {
    const [result] = await this.connection
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .limit(1);

    return result ?? null;
  }

  @ReadOnly()
  async findByEmail(email: string): Promise<ApplicationUser | null> {
    const [result] = await this.connection
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.email, normalizeEmail(email))
        )
      )
      .limit(1);

    return result ?? null;
  }

  @ReadOnly()
  async findByGlobalUserId(
    globalUserId: string
  ): Promise<ApplicationUser | null> {
    const [result] = await this.connection
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.globalUserId, globalUserId)
        )
      )
      .limit(1);

    return result ?? null;
  }

  @ReadOnly()
  async getAll(): Promise<ApplicationUser[]> {
    return this.connection
      .select()
      .from(applicationUser)
      .where(eq(applicationUser.applicationId, this.applicationId));
  }

  @ReadOnly()
  async isActive(userId: string): Promise<boolean> {
    const member = await this.find(userId);
    return member?.status === "active";
  }

  /**
   * Link an application identity to a proven platform identity.
   * The caller is responsible for completing the ownership challenge first.
   */
  @Transactional()
  async linkGlobalUser(
    userId: string,
    globalUserId: string
  ): Promise<ApplicationUser | null> {
    const [result] = await this.connection
      .update(applicationUser)
      .set({ globalUserId, updatedAt: new Date() })
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning();

    return result ?? null;
  }

  /** Blocking an identity immediately revokes every session in this realm. */
  @Transactional()
  async setStatus(
    userId: string,
    status: ApplicationUserStatus
  ): Promise<ApplicationUser | null> {
    const [result] = await this.connection
      .update(applicationUser)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning();

    if (result && status === "blocked") {
      await this.connection
        .delete(applicationSession)
        .where(
          and(
            eq(applicationSession.applicationId, this.applicationId),
            eq(applicationSession.userId, userId)
          )
        );
    }

    return result ?? null;
  }

  @Transactional()
  async remove(userId: string): Promise<boolean> {
    const result = await this.connection
      .delete(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning({ id: applicationUser.id });

    return result.length > 0;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
