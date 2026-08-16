import {
  validatePersistedSegmentDefinition,
  type SegmentDefinitionV1,
  type SegmentEntityReference,
  type SegmentStoreEvaluationContext,
} from "@shopana/customer-segment-dsl";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  compileCustomerSegmentMatchQuery,
  compileCustomerSegmentCountQuery,
  compileCustomerSegmentScanQuery,
} from "../../segments/compiler.js";
import { CUSTOMER_SEGMENT_REGISTRY } from "../../segments/registry.js";
import { BaseRepository } from "../BaseRepository.js";
import { customerGroup, customerTag } from "../models/index.js";

export class CustomerSegmentEvaluationRepository extends BaseRepository {
  @Transactional()
  async matchesCustomer(input: {
    readonly definition: unknown;
    readonly customerId: string;
    readonly storeContext: SegmentStoreEvaluationContext;
    readonly effectiveAt: string;
  }): Promise<boolean> {
    this.assertStore(input.storeContext);
    const definition = validatePersistedSegmentDefinition(
      input.definition,
      CUSTOMER_SEGMENT_REGISTRY,
      input.storeContext,
    );
    await this.connection.execute(sql`SELECT set_config('statement_timeout', '10000', true)`);
    const rows = await this.connection.execute<{ id: string }>(
      compileCustomerSegmentMatchQuery(definition, input.customerId, {
        store: input.storeContext,
        effectiveAt: input.effectiveAt,
      }),
    );
    return rows.length > 0;
  }

  @Transactional()
  async preview(input: {
    readonly definition: SegmentDefinitionV1;
    readonly storeContext: SegmentStoreEvaluationContext;
    readonly effectiveAt: string;
    readonly afterCustomerId: string | null;
    readonly limit: number;
  }): Promise<{ readonly customerIds: readonly string[]; readonly totalCount: number; readonly hasNextPage: boolean }> {
    this.assertStore(input.storeContext);
    const definition = validatePersistedSegmentDefinition(
      input.definition,
      CUSTOMER_SEGMENT_REGISTRY,
      input.storeContext,
    );
    await this.connection.execute(sql`SELECT set_config('statement_timeout', '2000', true)`);
    const [rows, counts] = await Promise.all([
      this.connection.execute<{ id: string }>(
        compileCustomerSegmentScanQuery(definition, {
          store: input.storeContext,
          effectiveAt: input.effectiveAt,
        }, input.afterCustomerId, input.limit + 1),
      ),
      this.connection.execute<{ count: number }>(
        compileCustomerSegmentCountQuery(definition, {
          store: input.storeContext,
          effectiveAt: input.effectiveAt,
        }),
      ),
    ]);
    return {
      customerIds: rows.slice(0, input.limit).map((row) => row.id),
      totalCount: counts[0]?.count ?? 0,
      hasNextPage: rows.length > input.limit,
    };
  }

  @Transactional()
  async scanMatchingCustomerIds(input: {
    readonly definition: SegmentDefinitionV1;
    readonly storeContext: SegmentStoreEvaluationContext;
    readonly effectiveAt: string;
    readonly afterCustomerId: string | null;
    readonly limit: number;
  }): Promise<readonly string[]> {
    this.assertStore(input.storeContext);
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 1_000) {
      throw new Error("Segment scan limit must be between 1 and 1000");
    }
    const definition = validatePersistedSegmentDefinition(
      input.definition,
      CUSTOMER_SEGMENT_REGISTRY,
      input.storeContext,
    );
    await this.connection.execute(sql`SELECT set_config('statement_timeout', '10000', true)`);
    const rows = await this.connection.execute<{ id: string }>(
      compileCustomerSegmentScanQuery(definition, {
        store: input.storeContext,
        effectiveAt: input.effectiveAt,
      }, input.afterCustomerId, input.limit),
    );
    return rows.map((row) => row.id);
  }

  @ReadOnly()
  async existingEntityReferences(
    references: readonly SegmentEntityReference[],
  ): Promise<ReadonlySet<string>> {
    const tagIds = uniqueIds(references, GlobalIdEntity.CustomerTag);
    const groupIds = uniqueIds(references, GlobalIdEntity.CustomerGroup);
    const [tags, groups] = await Promise.all([
      tagIds.length === 0
        ? []
        : this.connection
            .select({ id: customerTag.id })
            .from(customerTag)
            .where(and(
              eq(customerTag.storeId, this.storeId),
              inArray(customerTag.id, tagIds),
              isNull(customerTag.deletedAt),
            )),
      groupIds.length === 0
        ? []
        : this.connection
            .select({ id: customerGroup.id })
            .from(customerGroup)
            .where(and(
              eq(customerGroup.storeId, this.storeId),
              inArray(customerGroup.id, groupIds),
              isNull(customerGroup.deletedAt),
            )),
    ]);
    return new Set([
      ...tags.map((row) => `${GlobalIdEntity.CustomerTag}\0${row.id}`),
      ...groups.map((row) => `${GlobalIdEntity.CustomerGroup}\0${row.id}`),
    ]);
  }

  private assertStore(context: SegmentStoreEvaluationContext): void {
    if (context.storeId !== this.storeId) {
      throw new Error("Segment evaluation cannot cross tenant boundary");
    }
  }
}

function uniqueIds(
  references: readonly SegmentEntityReference[],
  entity: string,
): string[] {
  return [...new Set(
    references
      .filter((reference) => reference.entity === entity)
      .map((reference) => reference.id),
  )];
}
