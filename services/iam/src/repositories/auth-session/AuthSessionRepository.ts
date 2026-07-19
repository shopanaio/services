import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import {
  assertApplicationId,
  type AuthAdapterScope,
} from "../../auth/AuthScope.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  applicationSession,
  applicationAuthConfiguration,
  applicationUser,
  type ApplicationSession,
  type ApplicationUser,
} from "../models/application-auth.js";
import {
  session,
  user,
  type Session,
  type User,
} from "../models/auth.js";
import { application, organization } from "../models/authorization.js";

export type AuthSession = Session | ApplicationSession;
export type ValidatedAuthSession =
  | { kind: "platform"; session: Session; user: User }
  | {
      kind: "application";
      session: ApplicationSession;
      user: ApplicationUser;
    };

/**
 * Creates repositories bound to exactly one authentication realm.
 * Application access always requires an explicit application ID.
 */
export class AuthSessionRepositoryFactory {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  forPlatform(): AuthSessionRepository {
    return new AuthSessionRepository(this.db, this.txManager, {
      kind: "platform",
    });
  }

  forApplication(applicationId: string): AuthSessionRepository {
    assertApplicationId(applicationId);
    return new AuthSessionRepository(this.db, this.txManager, {
      kind: "application",
      applicationId,
    });
  }
}

export class AuthSessionRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly scope: AuthAdapterScope
  ) {
    super(db, txManager);
    if (scope.kind === "application") {
      assertApplicationId(scope.applicationId);
    }
  }

  @ReadOnly()
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    if (this.scope.kind === "application") {
      return this.connection
        .select()
        .from(applicationSession)
        .where(
          and(
            eq(applicationSession.applicationId, this.scope.applicationId),
            eq(applicationSession.userId, userId),
            gt(applicationSession.expiresAt, new Date())
          )
        );
    }

    return this.connection
      .select()
      .from(session)
      .where(
        and(eq(session.userId, userId), gt(session.expiresAt, new Date()))
      );
  }

  /**
   * Validate the live database state behind an access JWT.
   * A valid signature alone is insufficient because sessions can be revoked
   * before the access token expires.
   */
  @ReadOnly()
  async validate(
    userId: string,
    sessionId: string
  ): Promise<ValidatedAuthSession | null> {
    if (this.scope.kind === "application") {
      const [result] = await this.connection
        .select({ session: applicationSession, user: applicationUser })
        .from(applicationSession)
        .innerJoin(
          applicationUser,
          and(
            eq(
              applicationUser.applicationId,
              applicationSession.applicationId
            ),
            eq(applicationUser.id, applicationSession.userId)
          )
        )
        .innerJoin(
          application,
          eq(application.id, applicationSession.applicationId)
        )
        .innerJoin(
          organization,
          eq(organization.id, application.organizationId)
        )
        .innerJoin(
          applicationAuthConfiguration,
          eq(
            applicationAuthConfiguration.applicationId,
            application.id
          )
        )
        .where(
          and(
            eq(applicationSession.applicationId, this.scope.applicationId),
            eq(applicationSession.id, sessionId),
            eq(applicationSession.userId, userId),
            gt(applicationSession.expiresAt, new Date()),
            eq(applicationUser.status, "active"),
            eq(applicationAuthConfiguration.realmEnabled, true),
            isNull(application.deletedAt),
            isNull(organization.deletedAt)
          )
        )
        .limit(1);

      return result
        ? { kind: "application", session: result.session, user: result.user }
        : null;
    }

    const [result] = await this.connection
      .select({ session, user })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .where(
        and(
          eq(session.id, sessionId),
          eq(session.userId, userId),
          gt(session.expiresAt, new Date())
        )
      )
      .limit(1);

    return result
      ? { kind: "platform", session: result.session, user: result.user }
      : null;
  }

  @Transactional()
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    if (this.scope.kind === "application") {
      const rows = await this.connection
        .delete(applicationSession)
        .where(
          and(
            eq(applicationSession.applicationId, this.scope.applicationId),
            eq(applicationSession.id, sessionId),
            eq(applicationSession.userId, userId)
          )
        )
        .returning({ id: applicationSession.id });

      return rows.length > 0;
    }

    const rows = await this.connection
      .delete(session)
      .where(
        and(eq(session.id, sessionId), eq(session.userId, userId))
      )
      .returning({ id: session.id });

    return rows.length > 0;
  }

  @Transactional()
  async revokeAllSessions(userId: string): Promise<number> {
    if (this.scope.kind === "application") {
      const rows = await this.connection
        .delete(applicationSession)
        .where(
          and(
            eq(applicationSession.applicationId, this.scope.applicationId),
            eq(applicationSession.userId, userId)
          )
        )
        .returning({ id: applicationSession.id });

      return rows.length;
    }

    const rows = await this.connection
      .delete(session)
      .where(eq(session.userId, userId))
      .returning({ id: session.id });

    return rows.length;
  }

  @Transactional()
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    if (this.scope.kind === "application") {
      const rows = await this.connection
        .delete(applicationSession)
        .where(
          and(
            eq(applicationSession.applicationId, this.scope.applicationId),
            eq(applicationSession.userId, userId),
            ne(applicationSession.id, currentSessionId)
          )
        )
        .returning({ id: applicationSession.id });

      return rows.length;
    }

    const rows = await this.connection
      .delete(session)
      .where(
        and(
          eq(session.userId, userId),
          ne(session.id, currentSessionId)
        )
      )
      .returning({ id: session.id });

    return rows.length;
  }
}
