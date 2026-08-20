import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  market,
  marketCountry,
  marketCurrency,
  marketLocale,
  type Market,
  type MarketCountry,
  type MarketCurrency,
  type MarketLocale,
} from "../models/index.js";

export interface MarketSnapshot {
  market: Market;
  countries: MarketCountry[];
  locales: MarketLocale[];
  currencies: MarketCurrency[];
}

export const marketRelayQuery = createRelayQuery(
  createQuery(market).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "market", tieBreaker: "id" },
);

export type MarketRelayInput = InferRelayInput<typeof marketRelayQuery>;

export interface MarketConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class MarketRepository extends BaseRepository {
  @ReadOnly()
  async findActiveById(storeId: string, id: string): Promise<Market | null> {
    const [result] = await this.connection
      .select()
      .from(market)
      .where(
        and(
          eq(market.storeId, storeId),
          eq(market.id, id),
          eq(market.status, "active"),
          isNull(market.deletedAt),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  @ReadOnly()
  async findActiveByHandle(storeId: string, handle: string): Promise<Market | null> {
    const [result] = await this.connection
      .select()
      .from(market)
      .where(
        and(
          eq(market.storeId, storeId),
          eq(market.code, handle),
          eq(market.status, "active"),
          isNull(market.deletedAt),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  @ReadOnly()
  async findDefaultActive(storeId: string): Promise<Market | null> {
    const [result] = await this.connection
      .select()
      .from(market)
      .where(
        and(
          eq(market.storeId, storeId),
          eq(market.status, "active"),
          eq(market.isDefault, true),
          isNull(market.deletedAt),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  @ReadOnly()
  async findAllActive(storeId: string): Promise<Market[]> {
    return this.connection
      .select()
      .from(market)
      .where(
        and(eq(market.storeId, storeId), eq(market.status, "active"), isNull(market.deletedAt)),
      )
      .orderBy(asc(market.code), asc(market.id));
  }

  @ReadOnly()
  async getConnection(storeId: string, args: MarketRelayInput): Promise<MarketConnectionResult> {
    const where: MarketRelayInput["where"] = {
      _and: [
        { storeId: { _eq: storeId } },
        { status: { _eq: "active" } },
        { deletedAt: { _is: null } },
      ],
    };
    const input: MarketRelayInput = {
      ...args,
      where,
      orderBy: [{ field: "code", direction: "asc" }],
    };
    const [result, totalCount] = await Promise.all([
      marketRelayQuery.execute(this.connection, input),
      marketRelayQuery.count(this.connection, { where }),
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

  @ReadOnly()
  async getSnapshot(storeId: string, id: string): Promise<MarketSnapshot | null> {
    const item = await this.findActiveById(storeId, id);
    if (!item) return null;

    const [countries, locales, currencies] = await Promise.all([
      this.connection
        .select()
        .from(marketCountry)
        .where(and(eq(marketCountry.storeId, storeId), eq(marketCountry.marketId, id)))
        .orderBy(asc(marketCountry.countryCode)),
      this.connection
        .select()
        .from(marketLocale)
        .where(and(eq(marketLocale.storeId, storeId), eq(marketLocale.marketId, id)))
        .orderBy(asc(marketLocale.localeCode)),
      this.connection
        .select()
        .from(marketCurrency)
        .where(and(eq(marketCurrency.storeId, storeId), eq(marketCurrency.marketId, id)))
        .orderBy(asc(marketCurrency.currencyCode)),
    ]);

    return { market: item, countries, locales, currencies };
  }

  @ReadOnly()
  async getSnapshotsByIds(storeId: string, ids: readonly string[]): Promise<MarketSnapshot[]> {
    if (ids.length === 0) return [];

    const items = await this.connection
      .select()
      .from(market)
      .where(
        and(
          eq(market.storeId, storeId),
          inArray(market.id, [...ids]),
          eq(market.status, "active"),
          isNull(market.deletedAt),
        ),
      );
    if (items.length === 0) return [];

    const itemIds = items.map(({ id }) => id);
    const [countries, locales, currencies] = await Promise.all([
      this.connection
        .select()
        .from(marketCountry)
        .where(and(eq(marketCountry.storeId, storeId), inArray(marketCountry.marketId, itemIds)))
        .orderBy(asc(marketCountry.countryCode)),
      this.connection
        .select()
        .from(marketLocale)
        .where(and(eq(marketLocale.storeId, storeId), inArray(marketLocale.marketId, itemIds)))
        .orderBy(asc(marketLocale.localeCode)),
      this.connection
        .select()
        .from(marketCurrency)
        .where(and(eq(marketCurrency.storeId, storeId), inArray(marketCurrency.marketId, itemIds)))
        .orderBy(asc(marketCurrency.currencyCode)),
    ]);

    return items.map((item) => ({
      market: item,
      countries: countries.filter(({ marketId }) => marketId === item.id),
      locales: locales.filter(({ marketId }) => marketId === item.id),
      currencies: currencies.filter(({ marketId }) => marketId === item.id),
    }));
  }
}
