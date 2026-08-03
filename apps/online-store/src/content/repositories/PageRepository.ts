import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { BaseRepository } from "./BaseRepository.js";
import {
  pageListView,
  pages,
  type NewPageModel,
  type PageModel,
} from "./models/index.js";
import type { OnlineStoreScope, PageRecord } from "./types.js";
import { createGlobalIdWhereFieldMapper } from "./global-id-where-mappers.js";

export const pageRelayQuery = createRelayQuery(
  createQuery(pageListView)
    .include(["id"])
    .mapWhereField(
      "id",
      createGlobalIdWhereFieldMapper(GlobalIdEntity.OnlineStorePage),
    )
    .maxLimit(100)
    .defaultLimit(20),
  { name: "onlineStorePage", tieBreaker: "id" },
);

export type PageRelayInput = InferRelayInput<typeof pageRelayQuery>;

export interface PageConnectionResult {
  readonly edges: ReadonlyArray<{
    readonly cursor: string;
    readonly nodeId: string;
  }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export interface CreatePageInput {
  readonly handle: string;
  readonly templateSuffix?: string | null;
  readonly publishedAt?: string | null;
}

export interface UpdatePageInput {
  readonly handle?: string;
  readonly templateSuffix?: string | null;
  readonly publishedAt?: string | null;
  readonly expectedRevision?: number;
}

export class PageRepository extends BaseRepository {
  async exists(scope: OnlineStoreScope, pageId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: pages.id })
      .from(pages)
      .where(this.pageOwnership(scope, pageId))
      .limit(1);
    return rows.length > 0;
  }

  async findById(
    scope: OnlineStoreScope,
    pageId: string,
  ): Promise<PageRecord | null> {
    const rows = await this.connection
      .select()
      .from(pages)
      .where(this.pageOwnership(scope, pageId))
      .limit(1);
    return rows[0] ? mapPage(rows[0]) : null;
  }

  async findByHandle(
    scope: OnlineStoreScope,
    handle: string,
  ): Promise<PageRecord | null> {
    const rows = await this.connection
      .select()
      .from(pages)
      .where(and(this.pageScope(scope), eq(pages.handle, handle)))
      .limit(1);
    return rows[0] ? mapPage(rows[0]) : null;
  }

  async findPublishedByHandle(
    scope: OnlineStoreScope,
    handle: string,
    at = new Date().toISOString(),
  ): Promise<PageRecord | null> {
    const rows = await this.connection
      .select()
      .from(pages)
      .where(
        and(
          this.pageScope(scope),
          eq(pages.handle, handle),
          isNotNull(pages.publishedAt),
          lte(pages.publishedAt, at),
        ),
      )
      .limit(1);
    return rows[0] ? mapPage(rows[0]) : null;
  }

  async getConnection(
    scope: OnlineStoreScope,
    args: PageRelayInput,
    locale: string,
  ): Promise<PageConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;
    const mergedWhere: PageRelayInput["where"] = {
      _and: [
        { installationId: { _eq: scope.installationId } },
        { storeId: { _eq: scope.storeId } },
        { deletedAt: { _is: null } },
        { locale: { _eq: locale } },
        ...(where ? [where] : []),
      ],
    };
    const input: PageRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      pageRelayQuery.execute(this.connection, input),
      pageRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async getByIds(
    scope: OnlineStoreScope,
    pageIds: readonly string[],
  ): Promise<readonly PageRecord[]> {
    if (pageIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(pages)
      .where(
        and(
          this.pageScope(scope),
          inArray(pages.id, [...new Set(pageIds)]),
        ),
      );
    return Object.freeze(rows.map(mapPage));
  }

  async create(
    scope: OnlineStoreScope,
    input: CreatePageInput,
  ): Promise<PageRecord> {
    await this.assertInstallationScope(scope);
    const timestamp = now();
    const insert: NewPageModel = {
      installationId: scope.installationId,
      storeId: scope.storeId,
      handle: input.handle,
      templateSuffix: input.templateSuffix ?? null,
      publishedAt: input.publishedAt ?? null,
      revision: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    const rows = await this.connection.insert(pages).values(insert).returning();
    return mapPage(requiredRow(rows[0]));
  }

  async update(
    scope: OnlineStoreScope,
    pageId: string,
    input: UpdatePageInput,
  ): Promise<PageRecord | null> {
    const rows = await this.connection
      .update(pages)
      .set({
        handle: input.handle,
        templateSuffix: input.templateSuffix,
        publishedAt: input.publishedAt,
        updatedAt: now(),
        revision: sql`${pages.revision} + 1`,
      })
      .where(
        and(
          this.pageOwnership(scope, pageId),
          input.expectedRevision === undefined
            ? undefined
            : eq(pages.revision, input.expectedRevision),
        ),
      )
      .returning();
    return rows[0] ? mapPage(rows[0]) : null;
  }

  async softDelete(
    scope: OnlineStoreScope,
    pageId: string,
    expectedRevision?: number,
  ): Promise<boolean> {
    const timestamp = now();
    const rows = await this.connection
      .update(pages)
      .set({
        deletedAt: timestamp,
        updatedAt: timestamp,
        revision: sql`${pages.revision} + 1`,
      })
      .where(
        and(
          this.pageOwnership(scope, pageId),
          expectedRevision === undefined
            ? undefined
            : eq(pages.revision, expectedRevision),
        ),
      )
      .returning({ id: pages.id });
    return rows.length > 0;
  }
}

function mapPage(row: PageModel): PageRecord {
  return Object.freeze({ ...row });
}

function requiredRow(row: PageModel | undefined): PageModel {
  if (!row) throw new Error("page was not returned by PostgreSQL");
  return row;
}

function now(): string {
  return new Date().toISOString();
}
