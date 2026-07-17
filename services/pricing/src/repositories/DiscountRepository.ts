import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { ReadOnly } from "@shopana/shared-kernel";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { TransactionManager } from "@shopana/shared-kernel";
import { and, eq } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  discountListView,
  type DiscountListView,
} from "./models/readModels.js";

export const discountRelayQuery = createRelayQuery(
  createQuery(discountListView)
    .include(["id"])
    .mapWhereFields({
      id: (value) =>
        decodeGlobalIdByType(String(value), GlobalIdEntity.Discount),
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "discount", tieBreaker: "id" },
);

export type DiscountRelayInput = InferRelayInput<typeof discountRelayQuery>;

/** GraphQL adds the virtual `code` filter; it is mapped to `searchCodes`. */
export type DiscountConnectionInput = Omit<DiscountRelayInput, "where"> & {
  where?: unknown;
};

export interface DiscountConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

function mapVirtualWhereFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(mapVirtualWhereFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const virtualFieldMapping: Record<string, string> = {
    code: "searchCodes",
    tag: "searchTags",
    channelCode: "searchChannelCodes",
    featuredChannelCode: "searchFeaturedChannelCodes",
  };

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      virtualFieldMapping[key] ?? key,
      mapVirtualWhereFields(child),
    ]),
  );
}

export class DiscountRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @ReadOnly()
  async findById(id: string): Promise<DiscountListView | null> {
    const rows = await this.connection
      .select()
      .from(discountListView)
      .where(
        and(
          eq(discountListView.storeId, this.storeId),
          eq(discountListView.id, id),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getConnection(
    args: DiscountConnectionInput,
  ): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mappedWhere = mapVirtualWhereFields(where) as
      | DiscountRelayInput["where"]
      | undefined;
    const mergedWhere: DiscountRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(mappedWhere ? [mappedWhere] : []),
      ],
    };
    const executeInput: DiscountRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "updatedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      discountRelayQuery.execute(this.connection, executeInput),
      discountRelayQuery.count(this.connection, { where: mergedWhere }),
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
}
