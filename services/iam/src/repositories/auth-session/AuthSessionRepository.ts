import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, isNull, ne } from "drizzle-orm";
import {
  assertApplicationId,
  type AuthAdapterScope,
} from "../../auth/AuthScope.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import { session, type Session } from "../models/auth.js";

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
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.connection
      .select()
      .from(session)
      .where(and(eq(session.userId, userId), this.getScopeCondition()));
  }

  @Transactional()
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const rows = await this.connection
      .delete(session)
      .where(
        and(
          eq(session.id, sessionId),
          eq(session.userId, userId),
          this.getScopeCondition()
        )
      )
      .returning({ id: session.id });

    return rows.length > 0;
  }

  @Transactional()
  async revokeAllSessions(userId: string): Promise<number> {
    const rows = await this.connection
      .delete(session)
      .where(and(eq(session.userId, userId), this.getScopeCondition()))
      .returning({ id: session.id });

    return rows.length;
  }

  @Transactional()
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    const rows = await this.connection
      .delete(session)
      .where(
        and(
          eq(session.userId, userId),
          ne(session.id, currentSessionId),
          this.getScopeCondition()
        )
      )
      .returning({ id: session.id });

    return rows.length;
  }

  private getScopeCondition() {
    if (this.scope.kind === "application") {
      return and(
        eq(session.authScope, "application"),
        eq(session.applicationId, this.scope.applicationId)
      );
    }

    return and(
      eq(session.authScope, "platform"),
      isNull(session.applicationId)
    );
  }
}
