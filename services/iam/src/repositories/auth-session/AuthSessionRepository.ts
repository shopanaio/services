import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, gt, ne } from "drizzle-orm";
import {
  assertApplicationId,
  type AuthAdapterScope,
} from "../../auth/AuthScope.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  applicationSession,
  type ApplicationSession,
} from "../models/application-auth.js";
import { session, type Session } from "../models/auth.js";

export type AuthSession = Session | ApplicationSession;

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
