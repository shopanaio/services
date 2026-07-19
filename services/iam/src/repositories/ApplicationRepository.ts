import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  application,
  applicationAuthConfiguration,
  organization,
} from "./models/index.js";

export type ApplicationLifecycleStatus = "active" | "archived";
export type ApplicationOrderField =
  | "name"
  | "displayName"
  | "createdAt"
  | "updatedAt";

export interface ApplicationKey {
  id: string;
  organizationId?: string | null;
}

export interface ApplicationAdminRecord {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  description: string | null;
  status: ApplicationLifecycleStatus;
  resource: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export const applicationRelayQuery = createRelayQuery(
  createQuery(application)
    .include(["id"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "application", tieBreaker: "id" }
);

export type ApplicationRelayInput = InferRelayInput<
  typeof applicationRelayQuery
>;

export type ApplicationConnectionInput = ApplicationRelayInput & {
  organizationId: string;
};

export interface ApplicationConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

const applicationAdminSelection = {
  id: application.id,
  organizationId: application.organizationId,
  name: application.name,
  displayName: application.displayName,
  description: application.description,
  resource: applicationAuthConfiguration.resource,
  revision: applicationAuthConfiguration.revision,
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
  deletedAt: application.deletedAt,
} as const;

type ApplicationAdminRow = {
  [K in keyof typeof applicationAdminSelection]:
    (typeof applicationAdminSelection)[K]["_"]["data"];
};

export class ApplicationRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @ReadOnly()
  async getByKeys(
    keys: readonly ApplicationKey[]
  ): Promise<ApplicationAdminRecord[]> {
    if (keys.length === 0) return [];
    const ids = [...new Set(keys.map(({ id }) => id))];
    const rows = await this.connection
      .select(applicationAdminSelection)
      .from(application)
      .innerJoin(
        applicationAuthConfiguration,
        eq(applicationAuthConfiguration.applicationId, application.id)
      )
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .where(
        and(inArray(application.id, ids), isNull(organization.deletedAt))
      );
    const allowedKeys = new Set(
      keys.map(({ id, organizationId }) => `${organizationId ?? "*"}:${id}`)
    );
    return rows
      .filter(
        (row) =>
          allowedKeys.has(`*:${row.id}`) ||
          allowedKeys.has(`${row.organizationId}:${row.id}`)
      )
      .map(mapApplicationAdminRow);
  }

  @ReadOnly()
  async getConnection(
    input: ApplicationConnectionInput
  ): Promise<ApplicationConnectionResult> {
    const [activeOrganization] = await this.connection
      .select({ id: organization.id })
      .from(organization)
      .where(
        and(
          eq(organization.id, input.organizationId),
          isNull(organization.deletedAt)
        )
      )
      .limit(1);
    if (!activeOrganization) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    }

    const { organizationId, where, orderBy, ...pagination } = input;
    const mergedWhere: ApplicationRelayInput["where"] = {
      _and: [
        { organizationId: { _eq: organizationId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ApplicationRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      applicationRelayQuery.execute(this.connection, executeInput),
      applicationRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
}

function mapApplicationAdminRow(
  row: ApplicationAdminRow
): ApplicationAdminRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    status: row.deletedAt ? "archived" : "active",
    resource: row.resource,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.deletedAt,
  };
}
