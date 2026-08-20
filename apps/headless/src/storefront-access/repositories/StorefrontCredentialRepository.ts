import { and, asc, eq, exists, inArray } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  headlessStorefrontConnections,
  storefrontCredentials,
  type NewStorefrontCredentialModel,
  type StorefrontCredentialKind,
  type StorefrontCredentialModel,
} from "./models/index.js";
import type {
  HeadlessStorefrontScope,
  StorefrontCredentialRecord,
  StorefrontCredentialResolutionRecord,
} from "./types.js";

export interface CreateStorefrontCredentialInput {
  readonly connectionId: string;
  readonly kind: StorefrontCredentialKind;
  readonly kid: string;
  readonly tokenVersion: number;
  readonly pepperVersion: number;
  readonly tokenDigest: Uint8Array;
  readonly publicTokenCiphertext?: string;
  readonly label?: string;
  readonly tokenHint: string;
  readonly createdByType: string;
  readonly createdById?: string;
}

export interface RevokeStorefrontCredentialInput {
  readonly credentialId: string;
  readonly revokedByType: string;
  readonly revokedById?: string;
}

export class StorefrontCredentialRepository extends BaseRepository {
  create(
    scope: HeadlessStorefrontScope,
    input: CreateStorefrontCredentialInput,
  ): Promise<StorefrontCredentialRecord | null> {
    return this.txManager.run(async () => {
      const connectionRows = await this.connection
        .select({ id: headlessStorefrontConnections.id })
        .from(headlessStorefrontConnections)
        .where(
          and(
            this.connectionOwnership(scope, input.connectionId),
            eq(headlessStorefrontConnections.status, "ACTIVE"),
          ),
        )
        .limit(1);
      if (!connectionRows[0]) {
        return null;
      }
      const values: NewStorefrontCredentialModel = {
        organizationId: scope.organizationId,
        storeId: scope.storeId,
        connectionId: input.connectionId,
        kind: input.kind,
        kid: input.kid,
        tokenVersion: input.tokenVersion,
        pepperVersion: input.pepperVersion,
        tokenDigest: Uint8Array.from(input.tokenDigest),
        publicTokenCiphertext: input.publicTokenCiphertext ?? null,
        label: input.label ?? null,
        tokenHint: input.tokenHint,
        createdByType: input.createdByType,
        createdById: input.createdById ?? null,
      };
      const rows = await this.connection.insert(storefrontCredentials).values(values).returning();
      return rows[0] ? mapCredential(rows[0]) : null;
    });
  }

  async findById(
    scope: HeadlessStorefrontScope,
    credentialId: string,
  ): Promise<StorefrontCredentialRecord | null> {
    const rows = await this.connection
      .select({ credential: storefrontCredentials })
      .from(storefrontCredentials)
      .innerJoin(
        headlessStorefrontConnections,
        eq(headlessStorefrontConnections.id, storefrontCredentials.connectionId),
      )
      .where(
        and(
          eq(storefrontCredentials.id, credentialId),
          eq(storefrontCredentials.organizationId, scope.organizationId),
          eq(storefrontCredentials.storeId, scope.storeId),
          this.connectionScope(scope),
        ),
      )
      .limit(1);
    return rows[0] ? mapCredential(rows[0].credential) : null;
  }

  async findByKid(kid: string): Promise<StorefrontCredentialResolutionRecord | null> {
    const rows = await this.connection
      .select({
        credential: storefrontCredentials,
        installationId: headlessStorefrontConnections.installationId,
        connectionStatus: headlessStorefrontConnections.status,
      })
      .from(storefrontCredentials)
      .innerJoin(
        headlessStorefrontConnections,
        eq(headlessStorefrontConnections.id, storefrontCredentials.connectionId),
      )
      .where(
        and(
          eq(storefrontCredentials.kid, kid),
          eq(storefrontCredentials.organizationId, headlessStorefrontConnections.organizationId),
          eq(storefrontCredentials.storeId, headlessStorefrontConnections.storeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return Object.freeze({
      ...mapCredential(row.credential),
      installationId: row.installationId,
      connectionStatus: row.connectionStatus,
    });
  }

  async listByConnection(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<readonly StorefrontCredentialRecord[]> {
    const rows = await this.connection
      .select({ credential: storefrontCredentials })
      .from(storefrontCredentials)
      .innerJoin(
        headlessStorefrontConnections,
        eq(headlessStorefrontConnections.id, storefrontCredentials.connectionId),
      )
      .where(
        and(
          eq(storefrontCredentials.connectionId, connectionId),
          eq(storefrontCredentials.organizationId, scope.organizationId),
          eq(storefrontCredentials.storeId, scope.storeId),
          this.connectionOwnership(scope, connectionId),
        ),
      )
      .orderBy(asc(storefrontCredentials.createdAt), asc(storefrontCredentials.id));
    return Object.freeze(rows.map(({ credential }) => mapCredential(credential)));
  }

  async findActivePublicByConnection(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<StorefrontCredentialRecord | null> {
    const rows = await this.connection
      .select({ credential: storefrontCredentials })
      .from(storefrontCredentials)
      .innerJoin(
        headlessStorefrontConnections,
        eq(headlessStorefrontConnections.id, storefrontCredentials.connectionId),
      )
      .where(
        and(
          eq(storefrontCredentials.connectionId, connectionId),
          eq(storefrontCredentials.kind, "PUBLIC"),
          eq(storefrontCredentials.status, "ACTIVE"),
          eq(storefrontCredentials.organizationId, scope.organizationId),
          eq(storefrontCredentials.storeId, scope.storeId),
          this.connectionOwnership(scope, connectionId),
        ),
      )
      .limit(1);
    return rows[0] ? mapCredential(rows[0].credential) : null;
  }

  async setPublicTokenCiphertext(
    scope: HeadlessStorefrontScope,
    credentialId: string,
    ciphertext: string,
  ): Promise<StorefrontCredentialRecord | null> {
    const rows = await this.connection
      .update(storefrontCredentials)
      .set({ publicTokenCiphertext: ciphertext })
      .where(
        and(
          eq(storefrontCredentials.id, credentialId),
          eq(storefrontCredentials.kind, "PUBLIC"),
          eq(storefrontCredentials.organizationId, scope.organizationId),
          eq(storefrontCredentials.storeId, scope.storeId),
          this.credentialConnectionIsOwned(scope),
        ),
      )
      .returning();
    return rows[0] ? mapCredential(rows[0]) : null;
  }

  async revokePrivate(
    scope: HeadlessStorefrontScope,
    input: RevokeStorefrontCredentialInput,
  ): Promise<StorefrontCredentialRecord | null> {
    const timestamp = new Date().toISOString();
    const rows = await this.connection
      .update(storefrontCredentials)
      .set({
        status: "REVOKED",
        revokedByType: input.revokedByType,
        revokedById: input.revokedById ?? null,
        revokedAt: timestamp,
      })
      .where(
        and(
          eq(storefrontCredentials.id, input.credentialId),
          eq(storefrontCredentials.kind, "PRIVATE"),
          eq(storefrontCredentials.status, "ACTIVE"),
          eq(storefrontCredentials.organizationId, scope.organizationId),
          eq(storefrontCredentials.storeId, scope.storeId),
          this.credentialConnectionIsOwned(scope),
        ),
      )
      .returning();
    return rows[0] ? mapCredential(rows[0]) : null;
  }

  async revokeAllActiveByConnection(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    actor: {
      readonly type: string;
      readonly id?: string;
    },
  ): Promise<readonly StorefrontCredentialRecord[]> {
    if (!(await this.connectionIsOwned(scope, connectionId))) {
      return Object.freeze([]);
    }
    const timestamp = new Date().toISOString();
    const rows = await this.connection
      .update(storefrontCredentials)
      .set({
        status: "REVOKED",
        revokedByType: actor.type,
        revokedById: actor.id ?? null,
        revokedAt: timestamp,
      })
      .where(
        and(
          eq(storefrontCredentials.connectionId, connectionId),
          eq(storefrontCredentials.organizationId, scope.organizationId),
          eq(storefrontCredentials.storeId, scope.storeId),
          eq(storefrontCredentials.status, "ACTIVE"),
        ),
      )
      .returning();
    return Object.freeze(rows.map(mapCredential));
  }

  async markAuthenticatedCredentialsUsed(
    credentialIds: readonly string[],
    usedAt: string,
  ): Promise<void> {
    if (credentialIds.length === 0) return;
    await this.connection
      .update(storefrontCredentials)
      .set({ lastUsedAt: usedAt })
      .where(inArray(storefrontCredentials.id, [...credentialIds]));
  }

  private async connectionIsOwned(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .select({ id: headlessStorefrontConnections.id })
      .from(headlessStorefrontConnections)
      .where(this.connectionOwnership(scope, connectionId))
      .limit(1);
    return rows.length > 0;
  }

  private credentialConnectionIsOwned(scope: HeadlessStorefrontScope) {
    return exists(
      this.connection
        .select({ id: headlessStorefrontConnections.id })
        .from(headlessStorefrontConnections)
        .where(
          and(
            eq(headlessStorefrontConnections.id, storefrontCredentials.connectionId),
            this.connectionScope(scope),
          ),
        ),
    );
  }
}

function mapCredential(row: StorefrontCredentialModel): StorefrontCredentialRecord {
  return Object.freeze({
    ...row,
    tokenDigest: Uint8Array.from(row.tokenDigest),
  });
}
