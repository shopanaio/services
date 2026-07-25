import {
  and,
  desc,
  eq,
  inArray,
  ne,
  type SQL,
} from "drizzle-orm";
import type { AppInstallationStatus } from "@shopana/app-sdk";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { AppInstallationRecord } from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import { decodeAppInstallationGlobalId } from "../global-id-where-mappers.js";
import {
  appInstallations,
  type AppInstallationModel,
} from "../models/index.js";

export const appInstallationRelayQuery = createRelayQuery(
  createQuery(appInstallations)
    .include(["id"])
    .mapWhereFields({
      id: decodeAppInstallationGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "appInstallation", tieBreaker: "id" },
);

export type AppInstallationRelayInput = InferRelayInput<
  typeof appInstallationRelayQuery
>;

export type AppInstallationConnectionInput = AppInstallationRelayInput;

export interface AppInstallationConnectionResult {
  readonly edges: Array<{ cursor: string; nodeId: string }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export interface CreateAppInstallationInput {
  readonly appCode: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly status: AppInstallationStatus;
  readonly targetVersion: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly configurationVersion: number;
  readonly installedByUserId?: string;
}

export type UpdateAppInstallationInput = {
  -readonly [Key in keyof Pick<
    AppInstallationRecord,
    | "status"
    | "installedVersion"
    | "targetVersion"
    | "manifestHash"
    | "configuration"
    | "configurationVersion"
    | "installedByUserId"
    | "healthStatus"
    | "lastErrorCode"
    | "lastErrorMessage"
    | "installedAt"
    | "suspendedAt"
    | "uninstalledAt"
  >]?: Pick<
    AppInstallationRecord,
    | "status"
    | "installedVersion"
    | "targetVersion"
    | "manifestHash"
    | "configuration"
    | "configurationVersion"
    | "installedByUserId"
    | "healthStatus"
    | "lastErrorCode"
    | "lastErrorMessage"
    | "installedAt"
    | "suspendedAt"
    | "uninstalledAt"
  >[Key];
};

export class AppInstallationRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async findById(id: string): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(eq(appInstallations.id, id))
      .limit(1);
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  /**
   * GraphQL-facing lookup scoped to the current store.
   */
  async findByIdForStore(
    id: string,
  ): Promise<AppInstallationRecord | null> {
    return this.findByIdAndStore(id, this.storeId);
  }

  async findByIdAndStore(
    id: string,
    storeId: string,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, storeId),
          eq(appInstallations.id, id),
        ),
      )
      .limit(1);
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async getByIdsForStore(
    ids: readonly string[],
  ): Promise<AppInstallationRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          inArray(appInstallations.id, [...new Set(ids)]),
        ),
      );
    return rows.map(mapInstallation);
  }

  async lockById(
    id: string,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(eq(appInstallations.id, id))
      .limit(1)
      .for("update");
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async lockByIdForStore(
    id: string,
  ): Promise<AppInstallationRecord | null> {
    return this.lockByIdAndStore(id, this.storeId);
  }

  async lockByIdAndStore(
    id: string,
    storeId: string,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, storeId),
          eq(appInstallations.id, id),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async findNonTerminalByStoreAndAppForUpdate(
    storeId: string,
    appCode: string,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, storeId),
          eq(appInstallations.appCode, appCode),
          ne(appInstallations.status, "UNINSTALLED"),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async findNonTerminalByStoreAndApp(
    storeId: string,
    appCode: string,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, storeId),
          eq(appInstallations.appCode, appCode),
          ne(appInstallations.status, "UNINSTALLED"),
        ),
      )
      .limit(1);
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async findNonTerminalByAppForStore(
    appCode: string,
  ): Promise<AppInstallationRecord | null> {
    return this.findNonTerminalByStoreAndApp(this.storeId, appCode);
  }

  async getNonTerminalByAppCodesForStore(
    appCodes: readonly string[],
  ): Promise<AppInstallationRecord[]> {
    if (appCodes.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          inArray(appInstallations.appCode, [...new Set(appCodes)]),
          ne(appInstallations.status, "UNINSTALLED"),
        ),
      );
    return rows.map(mapInstallation);
  }

  listByStore(
    storeId: string,
    statuses?: readonly AppInstallationStatus[],
  ): Promise<AppInstallationRecord[]> {
    return this.list(
      eq(appInstallations.storeId, storeId),
      statuses,
    );
  }

  listByOrganization(
    organizationId: string,
    statuses?: readonly AppInstallationStatus[],
  ): Promise<AppInstallationRecord[]> {
    return this.list(
      eq(appInstallations.organizationId, organizationId),
      statuses,
    );
  }

  async getConnection(
    input: AppInstallationConnectionInput,
  ): Promise<AppInstallationConnectionResult> {
    const { where: inputWhere, orderBy, ...pagination } = input;
    const where: AppInstallationRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(inputWhere ? [inputWhere] : []),
      ],
    };
    const relayInput: AppInstallationRelayInput = {
      ...pagination,
      first:
        input.first == null && input.last == null ? 20 : input.first,
      where,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      appInstallationRelayQuery.execute(this.connection, relayInput),
      appInstallationRelayQuery.count(this.connection, { where }),
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

  async create(
    input: CreateAppInstallationInput,
  ): Promise<AppInstallationRecord> {
    const rows = await this.connection
      .insert(appInstallations)
      .values({
        appCode: input.appCode,
        organizationId: input.organizationId,
        storeId: input.storeId,
        status: input.status,
        targetVersion: input.targetVersion,
        configuration: { ...input.configuration },
        configurationVersion: input.configurationVersion,
        installedByUserId: input.installedByUserId ?? null,
      })
      .returning();
    return mapInstallation(requiredRow(rows[0], "App installation"));
  }

  async update(
    id: string,
    input: UpdateAppInstallationInput,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .update(appInstallations)
      .set({
        ...input,
        configuration:
          input.configuration === undefined
            ? undefined
            : { ...input.configuration },
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appInstallations.id, id))
      .returning();
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async updateForStore(
    id: string,
    input: UpdateAppInstallationInput,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .update(appInstallations)
      .set({
        ...input,
        configuration:
          input.configuration === undefined
            ? undefined
            : { ...input.configuration },
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appInstallations.id, id),
        ),
      )
      .returning();
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async updateConfiguration(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly configuration: Readonly<Record<string, unknown>>;
  }): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .update(appInstallations)
      .set({
        configuration: { ...input.configuration },
        configurationVersion: input.expectedVersion + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(appInstallations.id, input.id),
          eq(
            appInstallations.configurationVersion,
            input.expectedVersion,
          ),
        ),
      )
      .returning();
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async updateConfigurationForStore(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly configuration: Readonly<Record<string, unknown>>;
  }): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .update(appInstallations)
      .set({
        configuration: { ...input.configuration },
        configurationVersion: input.expectedVersion + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appInstallations.id, input.id),
          eq(
            appInstallations.configurationVersion,
            input.expectedVersion,
          ),
        ),
      )
      .returning();
    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  private async list(
    scope: SQL,
    statuses?: readonly AppInstallationStatus[],
  ): Promise<AppInstallationRecord[]> {
    const statusCondition =
      statuses && statuses.length > 0
        ? inArray(appInstallations.status, [...statuses])
        : undefined;
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(and(scope, statusCondition))
      .orderBy(desc(appInstallations.createdAt));
    return rows.map(mapInstallation);
  }
}

function mapInstallation(
  row: AppInstallationModel,
): AppInstallationRecord {
  return {
    ...row,
    configuration: Object.freeze({ ...row.configuration }),
  };
}

function requiredRow<T>(row: T | undefined, name: string): T {
  if (!row) {
    throw new Error(`${name} was not returned by PostgreSQL`);
  }
  return row;
}
