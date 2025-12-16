import { and, eq, inArray, isNull, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferExecuteOptions,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  project,
  type Project,
  type NewProject,
  type ProjectStatus,
  type WeightUnit,
  type DimensionUnit,
  type CurrencyCode,
  type LocaleCode,
} from "../models/index.js";

const projectQuery = createQuery(project).maxLimit(100).defaultLimit(20);

export const projectRelayQuery = createRelayQuery(
  createQuery(project).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "project", tieBreaker: "id" }
);

export type ProjectQueryInput = InferExecuteOptions<typeof projectQuery>;
export type ProjectRelayInput = InferRelayInput<typeof projectRelayQuery>;

export interface ProjectConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CreateProjectData {
  name: string;
  slug: string;
  status?: ProjectStatus;
  timezone?: string;
  phoneNumber?: string | null;
  email?: string | null;
  baseLocale?: LocaleCode;
  baseCurrency?: CurrencyCode;
}

export interface UpdateProjectData {
  name?: string;
  phoneNumber?: string | null;
  email?: string | null;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export class ProjectRepository extends BaseRepository {
  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: project.id })
      .from(project)
      .where(
        and(
          eq(project.id, id),
          isNull(project.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Project | null> {
    const result = await this.connection
      .select()
      .from(project)
      .where(
        and(
          eq(project.id, id),
          isNull(project.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const result = await this.connection
      .select()
      .from(project)
      .where(
        and(
          eq(project.slug, slug),
          isNull(project.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: CreateProjectData): Promise<Project> {
    const id = randomUUID();
    const now = new Date();

    const newProject: NewProject = {
      id,
      name: data.name,
      slug: data.slug,
      status: data.status ?? "active",
      timezone: data.timezone ?? "UTC",
      phoneNumber: data.phoneNumber ?? null,
      email: data.email ?? null,
      baseLocale: data.baseLocale ?? "en",
      baseCurrency: data.baseCurrency ?? "USD",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(project)
      .values(newProject)
      .returning();

    return result[0];
  }

  async update(id: string, data: UpdateProjectData): Promise<Project | null> {
    const updateData: Partial<NewProject> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.defaultWeightUnit !== undefined) updateData.defaultWeightUnit = data.defaultWeightUnit;
    if (data.defaultDimensionUnit !== undefined) updateData.defaultDimensionUnit = data.defaultDimensionUnit;

    const result = await this.connection
      .update(project)
      .set(updateData)
      .where(
        and(
          eq(project.id, id),
          isNull(project.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async updateBaseLocale(id: string, locale: LocaleCode): Promise<boolean> {
    const result = await this.connection
      .update(project)
      .set({ baseLocale: locale, updatedAt: new Date() })
      .where(
        and(
          eq(project.id, id),
          isNull(project.deletedAt)
        )
      )
      .returning({ id: project.id });

    return result.length > 0;
  }

  async updateBaseCurrency(id: string, currency: CurrencyCode): Promise<boolean> {
    const result = await this.connection
      .update(project)
      .set({ baseCurrency: currency, updatedAt: new Date() })
      .where(
        and(
          eq(project.id, id),
          isNull(project.deletedAt)
        )
      )
      .returning({ id: project.id });

    return result.length > 0;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .update(project)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(project.id, id),
          isNull(project.deletedAt)
        )
      )
      .returning({ id: project.id });

    return result.length > 0;
  }

  // ============ Query ============

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(project)
      .where(isNull(project.deletedAt));
    return result[0]?.count ?? 0;
  }

  async getConnection(args: ProjectRelayInput): Promise<ProjectConnectionResult> {
    const { where, order, ...paginationArgs } = args;

    // Merge user-provided where with deletedAt filter
    const mergedWhere: ProjectRelayInput["where"] = {
      _and: [
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: ProjectRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      order: order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      projectRelayQuery.execute(this.connection, executeInput),
      this.count(),
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

  async getMany(input?: ProjectQueryInput): Promise<Project[]> {
    return projectQuery.execute(this.connection, {
      ...input,
      order: input?.order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
      where: {
        ...input?.where,
        deletedAt: { _is: null },
      },
    });
  }

  // ============ Loader ============

  async getByIds(projectIds: readonly string[]): Promise<Project[]> {
    return this.connection
      .select()
      .from(project)
      .where(
        and(
          inArray(project.id, [...projectIds]),
          isNull(project.deletedAt)
        )
      );
  }
}
