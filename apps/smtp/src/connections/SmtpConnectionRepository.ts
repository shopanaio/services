import { and, asc, eq, inArray, ne } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { SmtpDatabase } from "./database.js";
import {
  smtpConnections,
  type SmtpConnectionModel,
  type SmtpConnectionProvider,
  type SmtpConnectionStatus,
} from "./models/index.js";
import type {
  SmtpConnectionRecord,
  SmtpConnectionScope,
  SmtpConnectionSecretRecord,
} from "./types.js";

export interface SmtpConnectionWriteInput {
  readonly displayName: string;
  readonly provider: SmtpConnectionProvider;
  readonly host: string;
  readonly port: number;
  readonly security: "NONE" | "STARTTLS" | "TLS";
  readonly username?: string;
}

export class SmtpConnectionRepository {
  constructor(
    private readonly database: SmtpDatabase,
    private readonly txManager: TransactionManager<SmtpDatabase>,
  ) {}

  private get connection(): SmtpDatabase {
    return this.txManager.getConnection() as SmtpDatabase;
  }

  async create(
    scope: SmtpConnectionScope,
    input: SmtpConnectionWriteInput & {
      readonly status: "ACTIVE" | "INACTIVE";
      readonly createdById?: string;
    },
  ): Promise<SmtpConnectionSecretRecord> {
    const rows = await this.connection
      .insert(smtpConnections)
      .values({
        ...scope,
        ...input,
        username: input.username ?? null,
        createdById: input.createdById ?? null,
      })
      .returning();
    return required(rows[0]);
  }

  async list(
    scope: SmtpConnectionScope,
    statuses?: readonly SmtpConnectionStatus[],
  ): Promise<readonly SmtpConnectionRecord[]> {
    const rows = await this.connection
      .select()
      .from(smtpConnections)
      .where(
        and(
          this.scope(scope),
          statuses?.length
            ? inArray(smtpConnections.status, [...new Set(statuses)])
            : undefined,
        ),
      )
      .orderBy(asc(smtpConnections.createdAt), asc(smtpConnections.id));
    return Object.freeze(rows.map(publicRecord));
  }

  async findById(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionRecord | null> {
    const row = await this.findSecretById(scope, connectionId);
    return row ? publicRecord(row) : null;
  }

  async findSecretById(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionSecretRecord | null> {
    const rows = await this.connection
      .select()
      .from(smtpConnections)
      .where(and(this.scope(scope), eq(smtpConnections.id, connectionId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async lockById(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionSecretRecord | null> {
    const rows = await this.connection
      .select()
      .from(smtpConnections)
      .where(and(this.scope(scope), eq(smtpConnections.id, connectionId)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async findActive(
    scope: SmtpConnectionScope,
  ): Promise<SmtpConnectionSecretRecord | null> {
    const rows = await this.connection
      .select()
      .from(smtpConnections)
      .where(and(this.scope(scope), eq(smtpConnections.status, "ACTIVE")))
      .limit(1);
    return rows[0] ?? null;
  }

  async update(
    scope: SmtpConnectionScope,
    connectionId: string,
    input: SmtpConnectionWriteInput,
  ): Promise<SmtpConnectionRecord | null> {
    const rows = await this.connection
      .update(smtpConnections)
      .set({
        ...input,
        username: input.username ?? null,
        updatedAt: now(),
      })
      .where(
        and(
          this.scope(scope),
          eq(smtpConnections.id, connectionId),
          ne(smtpConnections.status, "DISCONNECTED"),
        ),
      )
      .returning();
    return rows[0] ? publicRecord(rows[0]) : null;
  }

  async updatePasswordEnvelope(
    scope: SmtpConnectionScope,
    connectionId: string,
    passwordEnvelope: string | null,
  ): Promise<void> {
    await this.connection
      .update(smtpConnections)
      .set({ passwordEnvelope, updatedAt: now() })
      .where(and(this.scope(scope), eq(smtpConnections.id, connectionId)));
  }

  async activate(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionRecord | null> {
    await this.connection
      .update(smtpConnections)
      .set({ status: "INACTIVE", updatedAt: now() })
      .where(and(this.scope(scope), eq(smtpConnections.status, "ACTIVE")));
    const rows = await this.connection
      .update(smtpConnections)
      .set({ status: "ACTIVE", updatedAt: now() })
      .where(
        and(
          this.scope(scope),
          eq(smtpConnections.id, connectionId),
          eq(smtpConnections.status, "INACTIVE"),
        ),
      )
      .returning();
    return rows[0] ? publicRecord(rows[0]) : null;
  }

  async disconnect(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionRecord | null> {
    const timestamp = now();
    const rows = await this.connection
      .update(smtpConnections)
      .set({
        status: "DISCONNECTED",
        passwordEnvelope: null,
        disconnectedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        and(
          this.scope(scope),
          eq(smtpConnections.id, connectionId),
          ne(smtpConnections.status, "DISCONNECTED"),
        ),
      )
      .returning();
    return rows[0] ? publicRecord(rows[0]) : null;
  }

  private scope(scope: SmtpConnectionScope) {
    return and(
      eq(smtpConnections.installationId, scope.installationId),
      eq(smtpConnections.organizationId, scope.organizationId),
      eq(smtpConnections.storeId, scope.storeId),
    );
  }
}

function publicRecord(row: SmtpConnectionModel): SmtpConnectionRecord {
  const { passwordEnvelope, ...record } = row;
  return Object.freeze({
    ...record,
    hasPassword: passwordEnvelope !== null,
  });
}

function required(
  row: SmtpConnectionModel | undefined,
): SmtpConnectionModel {
  if (!row) {
    throw new Error("SMTP_CONNECTION_CREATE_FAILED");
  }
  return row;
}

function now(): string {
  return new Date().toISOString();
}
