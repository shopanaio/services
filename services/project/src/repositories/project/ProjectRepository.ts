import { eq, sql } from "drizzle-orm";
import type { PageInfo } from "@shopana/drizzle-query";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  project,
  locale,
  currency,
  type Project,
  type ProjectStatus,
  type WeightUnit,
  type DimensionUnit,
  type CurrencyCode,
  type LocaleCode,
} from "../models/index.js";

export interface ProjectQueryInput {}
export interface ProjectRelayInput {}

export interface ProjectConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CreateProjectData {
  id: string;
  name: string;
  slug: string;
  locales: LocaleCode[];
  defaultCurrency: CurrencyCode;
  status?: ProjectStatus;
  timezone?: string;
  email?: string | null;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export interface UpdateProjectData {
  name?: string;
  email?: string | null;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export class ProjectRepository extends BaseRepository {
  /**
   * Create a new project with locales and default currency.
   */
  @Transactional()
  async create(data: CreateProjectData): Promise<Project> {
    const now = new Date();
    const defaultLocale = data.locales[0];

    // Defer FK constraint checking until commit (handles circular FK)
    await this.connection.execute(sql`SET CONSTRAINTS ALL DEFERRED`);

    // 1. Create project first
    const [result] = await this.connection
      .insert(project)
      .values({
        id: data.id,
        name: data.name,
        slug: data.slug,
        status: data.status ?? "active",
        timezone: data.timezone ?? "UTC",
        email: data.email,
        defaultLocale,
        baseCurrency: data.defaultCurrency,
        defaultCurrency: data.defaultCurrency,
        defaultWeightUnit: data.defaultWeightUnit ?? "kg",
        defaultDimensionUnit: data.defaultDimensionUnit ?? "cm",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 2. Create locale records
    for (const localeCode of data.locales) {
      await this.connection.insert(locale).values({
        projectId: data.id,
        code: localeCode,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Create currency record
    await this.connection.insert(currency).values({
      projectId: data.id,
      code: data.defaultCurrency,
      isActive: true,
      exchangeRateAmount: BigInt(1),
      exchangeRateScale: 0,
      exchangeRate: 1,
      createdAt: now,
      updatedAt: now,
    });

    return result;
  }

  @ReadOnly()
  async findById(id: string): Promise<Project | undefined> {
    const [result] = await this.connection
      .select()
      .from(project)
      .where(eq(project.id, id));
    return result;
  }
}
