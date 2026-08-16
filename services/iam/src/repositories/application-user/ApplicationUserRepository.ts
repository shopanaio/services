import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { and, eq, gt, inArray } from "drizzle-orm";
import { assertApplicationId } from "../../auth/AuthScope.js";
import type { Database } from "../../infrastructure/db/database.js";
import {
  createApplicationAuthLiveStateInvalidationEvent,
  type ApplicationAuthLiveStateInvalidationBus,
} from "../../events/application-auth/index.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  applicationSession,
  applicationAccount,
  applicationOauthAccessToken,
  applicationOauthRefreshToken,
  applicationUser,
  type ApplicationUser,
  type ApplicationUserStatus,
} from "../models/application-auth.js";

export const applicationUserRelayQuery = createRelayQuery(
  createQuery(applicationUser)
    .include(["id"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "applicationUser", tieBreaker: "id" }
);

export type ApplicationUserRelayInput = InferRelayInput<
  typeof applicationUserRelayQuery
>;

export interface ApplicationUserConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface ApplicationUserLinkedAccountView {
  id: string;
  provider: string;
  isOnlyLoginMethod: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationUserSecurityView {
  userId: string;
  activeSessionCount: number;
  linkedAccountCount: number;
  hasPasswordLogin: boolean;
  linkedAccounts: readonly ApplicationUserLinkedAccountView[];
}

export type ApplicationUserAccountUnlinkResult =
  | { status: "unlinked"; accountId: string }
  | { status: "user_not_found" }
  | { status: "account_not_found" }
  | { status: "last_login_method" };

/** Creates application-user repositories bound to one mandatory application. */
export class ApplicationUserRepositoryFactory {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>,
    private readonly invalidation: ApplicationAuthLiveStateInvalidationBus
  ) {}

  forApplication(applicationId: string): ApplicationUserRepository {
    assertApplicationId(applicationId);
    return new ApplicationUserRepository(
      this.db,
      this.txManager,
      applicationId,
      this.invalidation
    );
  }
}

/** Management repository for application-local authentication identities. */
export class ApplicationUserRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly applicationId: string,
    private readonly invalidation: ApplicationAuthLiveStateInvalidationBus
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
  async getByIds(userIds: readonly string[]): Promise<ApplicationUser[]> {
    if (userIds.length === 0) return [];
    return this.connection
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          inArray(applicationUser.id, [...new Set(userIds)])
        )
      );
  }

  @ReadOnly()
  async getConnection(
    input: ApplicationUserRelayInput
  ): Promise<ApplicationUserConnectionResult> {
    const { where, orderBy, ...pagination } = input;
    const mergedWhere: ApplicationUserRelayInput["where"] = {
      _and: [
        { applicationId: { _eq: this.applicationId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ApplicationUserRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      applicationUserRelayQuery.execute(this.connection, executeInput),
      applicationUserRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @ReadOnly()
  async getSecurityViews(
    userIds: readonly string[]
  ): Promise<ApplicationUserSecurityView[]> {
    if (userIds.length === 0) return [];
    const uniqueUserIds = [...new Set(userIds)];
    const [sessions, accounts] = await Promise.all([
      this.connection
        .select({ userId: applicationSession.userId })
        .from(applicationSession)
        .where(
          and(
            eq(applicationSession.applicationId, this.applicationId),
            inArray(applicationSession.userId, uniqueUserIds),
            gt(applicationSession.expiresAt, new Date())
          )
        ),
      this.connection
        .select({
          id: applicationAccount.id,
          userId: applicationAccount.userId,
          provider: applicationAccount.providerId,
          createdAt: applicationAccount.createdAt,
          updatedAt: applicationAccount.updatedAt,
        })
        .from(applicationAccount)
        .where(
          and(
            eq(applicationAccount.applicationId, this.applicationId),
            inArray(applicationAccount.userId, uniqueUserIds)
          )
        )
        .orderBy(applicationAccount.providerId, applicationAccount.id),
    ]);

    const sessionCounts = countBy(sessions, ({ userId }) => userId);
    const accountsByUser = groupBy(accounts, ({ userId }) => userId);
    return uniqueUserIds.map((userId) => {
      const userAccounts = accountsByUser.get(userId) ?? [];
      const linkedAccounts = userAccounts.filter(
        ({ provider }) => provider !== "credential"
      );
      return {
        userId,
        activeSessionCount: sessionCounts.get(userId) ?? 0,
        linkedAccountCount: linkedAccounts.length,
        hasPasswordLogin: userAccounts.some(
          ({ provider }) => provider === "credential"
        ),
        linkedAccounts: Object.freeze(
          linkedAccounts.map((account) => ({
            id: account.id,
            provider: account.provider,
            isOnlyLoginMethod: userAccounts.length === 1,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          }))
        ),
      };
    });
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
  async setStatus(
    userId: string,
    status: ApplicationUserStatus
  ): Promise<ApplicationUser | null> {
    const result = await this.txManager.run(async () => {
      const [updated] = await this.connection
        .update(applicationUser)
        .set({ status, updatedAt: new Date() })
        .where(
          and(
            eq(applicationUser.applicationId, this.applicationId),
            eq(applicationUser.id, userId)
          )
        )
        .returning();

      if (updated && status === "blocked") {
        const revokedAt = new Date();
        await this.connection
          .delete(applicationOauthAccessToken)
          .where(
            and(
              eq(
                applicationOauthAccessToken.applicationId,
                this.applicationId
              ),
              eq(applicationOauthAccessToken.userId, userId)
            )
          );
        await this.connection
          .update(applicationOauthRefreshToken)
          .set({ revoked: revokedAt, sessionId: null })
          .where(
            and(
              eq(
                applicationOauthRefreshToken.applicationId,
                this.applicationId
              ),
              eq(applicationOauthRefreshToken.userId, userId)
            )
          );
        await this.connection
          .delete(applicationSession)
          .where(
            and(
              eq(applicationSession.applicationId, this.applicationId),
              eq(applicationSession.userId, userId)
            )
          );
      }
      return updated ?? null;
    });
    if (result) {
      await this.invalidation.publish(
        createApplicationAuthLiveStateInvalidationEvent({
          kind: "user",
          applicationId: this.applicationId,
          userId,
        })
      );
    }
    return result ?? null;
  }

  /**
   * Administrative status change. Runtime invalidation is deliberately owned
   * by the management service so it only happens after its audit transaction
   * commits successfully.
   */
  @Transactional()
  async setAdminStatus(
    userId: string,
    status: ApplicationUserStatus
  ): Promise<ApplicationUser | null> {
    const [updated] = await this.connection
      .update(applicationUser)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning();
    if (!updated) return null;
    if (status === "blocked") await this.revokeAllCredentials(userId);
    return updated;
  }

  /** Revoke every live credential for one identity in this application only. */
  @Transactional()
  async revokeAllAdminSessions(userId: string): Promise<number | null> {
    const user = await this.find(userId);
    if (!user) return null;
    const sessions = await this.connection
      .delete(applicationSession)
      .where(
        and(
          eq(applicationSession.applicationId, this.applicationId),
          eq(applicationSession.userId, userId)
        )
      )
      .returning({ id: applicationSession.id });
    const now = new Date();
    await this.connection
      .delete(applicationOauthAccessToken)
      .where(
        and(
          eq(applicationOauthAccessToken.applicationId, this.applicationId),
          eq(applicationOauthAccessToken.userId, userId)
        )
      );
    await this.connection
      .update(applicationOauthRefreshToken)
      .set({ revoked: now, sessionId: null })
      .where(
        and(
          eq(applicationOauthRefreshToken.applicationId, this.applicationId),
          eq(applicationOauthRefreshToken.userId, userId)
        )
      );
    return sessions.length;
  }

  /** Unlink a non-credential account without removing the last login method. */
  @Transactional()
  async unlinkAdminAccount(
    userId: string,
    accountId: string
  ): Promise<ApplicationUserAccountUnlinkResult> {
    const [user] = await this.connection
      .select({ id: applicationUser.id })
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .for("update")
      .limit(1);
    if (!user) return { status: "user_not_found" };
    const accounts = await this.connection
      .select({
        id: applicationAccount.id,
        provider: applicationAccount.providerId,
      })
      .from(applicationAccount)
      .where(
        and(
          eq(applicationAccount.applicationId, this.applicationId),
          eq(applicationAccount.userId, userId)
        )
      );
    const account = accounts.find(({ id }) => id === accountId);
    if (!account || account.provider === "credential") {
      return { status: "account_not_found" };
    }
    if (accounts.length <= 1) return { status: "last_login_method" };
    const rows = await this.connection
      .delete(applicationAccount)
      .where(
        and(
          eq(applicationAccount.applicationId, this.applicationId),
          eq(applicationAccount.userId, userId),
          eq(applicationAccount.id, accountId)
        )
      )
      .returning({ id: applicationAccount.id });
    if (rows.length !== 1) return { status: "account_not_found" };
    return { status: "unlinked", accountId: rows[0]!.id };
  }

  async remove(userId: string): Promise<boolean> {
    const deleted = await this.txManager.run(async () => {
      return this.removeWithinTransaction(userId);
    });
    if (deleted) await this.publishInvalidation(userId);
    return deleted;
  }

  async removeWithinTransaction(userId: string): Promise<boolean> {
    const result = await this.connection
      .delete(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId),
        ),
      )
      .returning({ id: applicationUser.id });
    return result.length > 0;
  }

  async publishInvalidation(userId: string): Promise<void> {
    await this.invalidation.publish(
      createApplicationAuthLiveStateInvalidationEvent({
        kind: "user",
        applicationId: this.applicationId,
        userId,
      }),
    );
  }

  private async revokeAllCredentials(userId: string): Promise<void> {
    const revokedAt = new Date();
    await this.connection
      .delete(applicationOauthAccessToken)
      .where(
        and(
          eq(applicationOauthAccessToken.applicationId, this.applicationId),
          eq(applicationOauthAccessToken.userId, userId)
        )
      );
    await this.connection
      .update(applicationOauthRefreshToken)
      .set({ revoked: revokedAt, sessionId: null })
      .where(
        and(
          eq(applicationOauthRefreshToken.applicationId, this.applicationId),
          eq(applicationOauthRefreshToken.userId, userId)
        )
      );
    await this.connection
      .delete(applicationSession)
      .where(
        and(
          eq(applicationSession.applicationId, this.applicationId),
          eq(applicationSession.userId, userId)
        )
      );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function groupBy<T>(
  values: readonly T[],
  key: (value: T) => string
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    const group = result.get(groupKey);
    if (group) group.push(value);
    else result.set(groupKey, [value]);
  }
  return result;
}

function countBy<T>(
  values: readonly T[],
  key: (value: T) => string
): Map<string, number> {
  const result = new Map<string, number>();
  for (const value of values) {
    const groupKey = key(value);
    result.set(groupKey, (result.get(groupKey) ?? 0) + 1);
  }
  return result;
}
