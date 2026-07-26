import { and, eq, sql } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import { storefrontMutationIdempotency } from "./models/index.js";
import type { HeadlessStorefrontScope } from "./types.js";

export class StorefrontMutationIdempotencyRepository
  extends BaseRepository
{
  async lockAndFind(
    scope: HeadlessStorefrontScope,
    operation: string,
    clientMutationId: string,
  ): Promise<string | null> {
    validateKey(clientMutationId);
    const lockKey =
      `${scope.installationId}:${operation}:${clientMutationId}`;
    await this.connection.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );
    const rows = await this.connection
      .select({ resourceId: storefrontMutationIdempotency.resourceId })
      .from(storefrontMutationIdempotency)
      .where(and(
        eq(
          storefrontMutationIdempotency.installationId,
          scope.installationId,
        ),
        eq(storefrontMutationIdempotency.organizationId, scope.organizationId),
        eq(storefrontMutationIdempotency.storeId, scope.storeId),
        eq(storefrontMutationIdempotency.operation, operation),
        eq(
          storefrontMutationIdempotency.clientMutationId,
          clientMutationId,
        ),
      ))
      .limit(1);
    return rows[0]?.resourceId ?? null;
  }

  async record(
    scope: HeadlessStorefrontScope,
    operation: string,
    clientMutationId: string,
    resourceId: string,
  ): Promise<void> {
    validateKey(clientMutationId);
    await this.connection.insert(storefrontMutationIdempotency).values({
      installationId: scope.installationId,
      organizationId: scope.organizationId,
      storeId: scope.storeId,
      operation,
      clientMutationId,
      resourceId,
    });
  }
}

function validateKey(value: string): void {
  if (!value.trim() || value.length > 255) {
    throw new Error("CLIENT_MUTATION_ID_INVALID");
  }
}
