import type { ShopanaAppDefinition } from "@shopana/app-sdk";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import { appCatalog, appListView } from "../models/index.js";

export const appRelayQuery = createRelayQuery(
  createQuery(appListView)
    .include(["code"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "app", tieBreaker: "code" },
);

export type AppRelayInput = InferRelayInput<typeof appRelayQuery>;
export type AppConnectionInput = AppRelayInput;

export interface AppConnectionResult {
  readonly edges: Array<{ cursor: string; nodeId: string }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export class AppRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async getConnection(
    input: AppConnectionInput,
    definitions: readonly ShopanaAppDefinition[],
  ): Promise<AppConnectionResult> {
    await this.synchronizeCatalog(definitions);

    const { where: inputWhere, orderBy, ...pagination } = input;
    const where: AppRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(inputWhere ? [inputWhere] : []),
      ],
    };
    const relayInput: AppRelayInput = {
      ...pagination,
      first:
        input.first == null && input.last == null ? 20 : input.first,
      where,
      orderBy: orderBy ?? [
        { field: "code", direction: "asc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      appRelayQuery.execute(this.connection, relayInput),
      appRelayQuery.count(this.connection, { where }),
    ]);

    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.code,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async synchronizeCatalog(
    definitions: readonly ShopanaAppDefinition[],
  ): Promise<void> {
    const codes = definitions.map(({ manifest }) => manifest.code);

    if (codes.length === 0) {
      await this.connection
        .delete(appCatalog)
        .where(eq(appCatalog.storeId, this.storeId));
      return;
    }

    await this.connection
      .insert(appCatalog)
      .values(
        definitions.map(({ manifest }) => ({
          storeId: this.storeId,
          appCode: manifest.code,
          version: manifest.version,
          displayName: manifest.displayName,
          description: manifest.description,
          capabilities: [...new Set(
            manifest.capabilities.map(({ key }) => key),
          )]
            .sort((left, right) => left.localeCompare(right))
            .join("\n"),
          manifest,
        })),
      )
      .onConflictDoUpdate({
        target: [appCatalog.storeId, appCatalog.appCode],
        set: {
          version: sql`excluded.version`,
          displayName: sql`excluded.display_name`,
          description: sql`excluded.description`,
          capabilities: sql`excluded.capabilities`,
          manifest: sql`excluded.manifest`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`
          ${appCatalog.version} IS DISTINCT FROM excluded.version
          OR ${appCatalog.displayName} IS DISTINCT FROM excluded.display_name
          OR ${appCatalog.description} IS DISTINCT FROM excluded.description
          OR ${appCatalog.capabilities} IS DISTINCT FROM excluded.capabilities
          OR ${appCatalog.manifest} IS DISTINCT FROM excluded.manifest
        `,
      });

    await this.connection
      .delete(appCatalog)
      .where(
        and(
          eq(appCatalog.storeId, this.storeId),
          notInArray(appCatalog.appCode, codes),
        ),
      );
  }
}
