import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  headlessStorefrontConnections,
  type HeadlessStorefrontConnectionModel,
  type HeadlessStorefrontConnectionStatus,
} from "./models/index.js";
import type {
  HeadlessStorefrontConnectionRecord,
  HeadlessStorefrontScope,
} from "./types.js";

export interface CreateHeadlessStorefrontConnectionInput {
  readonly displayName: string;
  readonly createdById?: string;
}

export class HeadlessStorefrontConnectionRepository
  extends BaseRepository
{
  async create(
    scope: HeadlessStorefrontScope,
    input: CreateHeadlessStorefrontConnectionInput,
  ): Promise<HeadlessStorefrontConnectionRecord> {
    const rows = await this.connection
      .insert(headlessStorefrontConnections)
      .values({
        installationId: scope.installationId,
        organizationId: scope.organizationId,
        storeId: scope.storeId,
        displayName: input.displayName,
        createdById: input.createdById ?? null,
      })
      .returning();
    return mapConnection(requiredRow(rows[0]));
  }

  async findById(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<HeadlessStorefrontConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(headlessStorefrontConnections)
      .where(this.connectionOwnership(scope, connectionId))
      .limit(1);
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async lockById(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<HeadlessStorefrontConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(headlessStorefrontConnections)
      .where(this.connectionOwnership(scope, connectionId))
      .limit(1)
      .for("update");
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async list(
    scope: HeadlessStorefrontScope,
    statuses?: readonly HeadlessStorefrontConnectionStatus[],
  ): Promise<readonly HeadlessStorefrontConnectionRecord[]> {
    const statusCondition =
      statuses && statuses.length > 0
        ? inArray(
            headlessStorefrontConnections.status,
            [...new Set(statuses)],
          )
        : undefined;
    const rows = await this.connection
      .select()
      .from(headlessStorefrontConnections)
      .where(
        and(
          eq(
            headlessStorefrontConnections.installationId,
            scope.installationId,
          ),
          eq(
            headlessStorefrontConnections.organizationId,
            scope.organizationId,
          ),
          eq(headlessStorefrontConnections.storeId, scope.storeId),
          statusCondition,
        ),
      )
      .orderBy(
        asc(headlessStorefrontConnections.createdAt),
        asc(headlessStorefrontConnections.id),
      );
    return Object.freeze(rows.map(mapConnection));
  }

  async updateDisplayName(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    displayName: string,
  ): Promise<HeadlessStorefrontConnectionRecord | null> {
    const rows = await this.connection
      .update(headlessStorefrontConnections)
      .set({
        displayName,
        updatedAt: now(),
      })
      .where(
        and(
          this.connectionOwnership(scope, connectionId),
          ne(headlessStorefrontConnections.status, "DISCONNECTED"),
        ),
      )
      .returning();
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async suspend(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<HeadlessStorefrontConnectionRecord | null> {
    const timestamp = now();
    const rows = await this.connection
      .update(headlessStorefrontConnections)
      .set({
        status: "SUSPENDED",
        suspendedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        and(
          this.connectionOwnership(scope, connectionId),
          eq(headlessStorefrontConnections.status, "ACTIVE"),
        ),
      )
      .returning();
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async resume(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<HeadlessStorefrontConnectionRecord | null> {
    const rows = await this.connection
      .update(headlessStorefrontConnections)
      .set({
        status: "ACTIVE",
        suspendedAt: null,
        updatedAt: now(),
      })
      .where(
        and(
          this.connectionOwnership(scope, connectionId),
          eq(headlessStorefrontConnections.status, "SUSPENDED"),
        ),
      )
      .returning();
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async disconnect(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<HeadlessStorefrontConnectionRecord | null> {
    const timestamp = now();
    const rows = await this.connection
      .update(headlessStorefrontConnections)
      .set({
        status: "DISCONNECTED",
        disconnectedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        and(
          this.connectionOwnership(scope, connectionId),
          ne(headlessStorefrontConnections.status, "DISCONNECTED"),
        ),
      )
      .returning();
    return rows[0] ? mapConnection(rows[0]) : null;
  }
}

function mapConnection(
  row: HeadlessStorefrontConnectionModel,
): HeadlessStorefrontConnectionRecord {
  return Object.freeze({ ...row });
}

function requiredRow(
  row: HeadlessStorefrontConnectionModel | undefined,
): HeadlessStorefrontConnectionModel {
  if (!row) {
    throw new Error(
      "Headless storefront connection was not returned by PostgreSQL",
    );
  }
  return row;
}

function now(): string {
  return new Date().toISOString();
}
