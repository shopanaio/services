import { and, asc, eq } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  headlessStorefrontConnections,
  storefrontAccessPolicies,
  storefrontAccessPolicyGrants,
} from "./models/index.js";
import type { HeadlessStorefrontScope, StorefrontAccessPolicyRecord } from "./types.js";

export class StorefrontAccessPolicyRepository extends BaseRepository {
  create(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    permissions: readonly string[],
  ): Promise<StorefrontAccessPolicyRecord | null> {
    return this.txManager.run(async () => {
      if (!(await this.connectionIsOwned(scope, connectionId))) {
        return null;
      }
      const rows = await this.connection
        .insert(storefrontAccessPolicies)
        .values({
          connectionId,
          organizationId: scope.organizationId,
          storeId: scope.storeId,
        })
        .returning();
      const policy = rows[0];
      if (!policy) {
        throw new Error("Storefront access policy was not returned by PostgreSQL");
      }
      const normalized = normalizePermissions(permissions);
      if (normalized.length > 0) {
        await this.connection.insert(storefrontAccessPolicyGrants).values(
          normalized.map((permission) => ({
            connectionId,
            permission,
          })),
        );
      }
      return Object.freeze({
        ...policy,
        permissions: normalized,
      });
    });
  }

  async findByConnectionId(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<StorefrontAccessPolicyRecord | null> {
    const rows = await this.connection
      .select({
        connectionId: storefrontAccessPolicies.connectionId,
        organizationId: storefrontAccessPolicies.organizationId,
        storeId: storefrontAccessPolicies.storeId,
        revision: storefrontAccessPolicies.revision,
        createdAt: storefrontAccessPolicies.createdAt,
        updatedAt: storefrontAccessPolicies.updatedAt,
        permission: storefrontAccessPolicyGrants.permission,
      })
      .from(storefrontAccessPolicies)
      .leftJoin(
        storefrontAccessPolicyGrants,
        eq(storefrontAccessPolicyGrants.connectionId, storefrontAccessPolicies.connectionId),
      )
      .where(
        and(
          this.policyOwnership(scope, connectionId),
          this.ownedConnectionExists(scope, connectionId),
        ),
      )
      .orderBy(asc(storefrontAccessPolicyGrants.permission));
    const first = rows[0];
    if (!first) {
      return null;
    }
    return Object.freeze({
      connectionId: first.connectionId,
      organizationId: first.organizationId,
      storeId: first.storeId,
      revision: first.revision,
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
      permissions: Object.freeze(
        rows.flatMap(({ permission }) => (permission === null ? [] : [permission])),
      ),
    });
  }

  replaceGrants(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    expectedRevision: number,
    permissions: readonly string[],
  ): Promise<StorefrontAccessPolicyRecord | null> {
    return this.txManager.run(async () => {
      const timestamp = new Date().toISOString();
      const rows = await this.connection
        .update(storefrontAccessPolicies)
        .set({
          revision: expectedRevision + 1,
          updatedAt: timestamp,
        })
        .where(
          and(
            this.policyOwnership(scope, connectionId),
            eq(storefrontAccessPolicies.revision, expectedRevision),
            this.ownedConnectionExists(scope, connectionId),
          ),
        )
        .returning();
      const policy = rows[0];
      if (!policy) {
        return null;
      }

      await this.connection
        .delete(storefrontAccessPolicyGrants)
        .where(eq(storefrontAccessPolicyGrants.connectionId, connectionId));
      const normalized = normalizePermissions(permissions);
      if (normalized.length > 0) {
        await this.connection.insert(storefrontAccessPolicyGrants).values(
          normalized.map((permission) => ({
            connectionId,
            permission,
          })),
        );
      }
      return Object.freeze({
        ...policy,
        permissions: normalized,
      });
    });
  }

  private policyOwnership(scope: HeadlessStorefrontScope, connectionId: string) {
    return and(
      eq(storefrontAccessPolicies.connectionId, connectionId),
      eq(storefrontAccessPolicies.organizationId, scope.organizationId),
      eq(storefrontAccessPolicies.storeId, scope.storeId),
    );
  }

  private async connectionIsOwned(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .select({ connectionId: storefrontAccessPolicies.connectionId })
      .from(storefrontAccessPolicies)
      .where(this.policyOwnership(scope, connectionId))
      .limit(1);
    if (rows.length > 0) {
      return false;
    }
    const connections = await this.connection
      .select({ id: headlessStorefrontConnections.id })
      .from(headlessStorefrontConnections)
      .where(this.connectionOwnership(scope, connectionId))
      .limit(1);
    return connections.length > 0;
  }
}

function normalizePermissions(permissions: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(permissions)].sort());
}
