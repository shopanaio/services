import { eq } from "drizzle-orm";
import type { PageInfo } from "@shopana/drizzle-query";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  project,
  locale,
  currency,
  projectIntegration,
  type Project,
  type ProjectIntegration,
  type ProjectStatus,
  type WeightUnit,
  type DimensionUnit,
  type CurrencyCode,
  type LocaleCode,
  type IamIntegrationConfig,
} from "../models/index.js";

/**
 * Base integration info
 */
export interface IntegrationInfo<TConfig = Record<string, unknown>> {
  provider: string;
  status: ProjectIntegration["status"];
  config: TConfig;
}

/**
 * Project with loaded integrations
 */
export interface ProjectWithIntegrations extends Project {
  integrations: {
    iam?: IntegrationInfo<IamIntegrationConfig>;
    payment?: IntegrationInfo;
    shipping?: IntegrationInfo;
    storage?: IntegrationInfo;
    email?: IntegrationInfo;
    analytics?: IntegrationInfo;
  };
}

export interface ProjectQueryInput {}
export interface ProjectRelayInput {}

export interface ProjectConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CreateProjectData {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
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
   * Load integrations for a project and attach to project object
   */
  private async loadIntegrations(proj: Project): Promise<ProjectWithIntegrations> {
    const integrations = await this.connection
      .select()
      .from(projectIntegration)
      .where(eq(projectIntegration.projectId, proj.id));

    const result: ProjectWithIntegrations = {
      ...proj,
      integrations: {},
    };

    for (const integration of integrations) {
      const info = {
        provider: integration.provider,
        status: integration.status,
        config: integration.config,
      };

      switch (integration.type) {
        case "iam":
          result.integrations.iam = {
            ...info,
            config: info.config as unknown as IamIntegrationConfig,
          };
          break;
        case "payment":
          result.integrations.payment = info;
          break;
        case "shipping":
          result.integrations.shipping = info;
          break;
        case "storage":
          result.integrations.storage = info;
          break;
        case "email":
          result.integrations.email = info;
          break;
        case "analytics":
          result.integrations.analytics = info;
          break;
      }
    }

    return result;
  }

  /**
   * Create a new project with locales and default currency.
   */
  @Transactional()
  async create(data: CreateProjectData): Promise<Project> {
    const now = new Date();
    const defaultLocale = data.locales[0];

    // 1. Create locale records first (required by project FK)
    for (const localeCode of data.locales) {
      await this.connection.insert(locale).values({
        projectId: data.id,
        code: localeCode,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Create currency records (required by project FK)
    for (const currencyCode of data.currencies) {
      await this.connection.insert(currency).values({
        projectId: data.id,
        code: currencyCode,
        isActive: true,
        exchangeRateAmount: BigInt(1),
        exchangeRateScale: 0,
        exchangeRate: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Create project (now FK references exist)
    const [result] = await this.connection
      .insert(project)
      .values({
        id: data.id,
        organizationId: data.organizationId,
        externalSystem: null,
        externalId: null,
        name: data.name,
        slug: data.slug,
        status: data.status ?? "active",
        timezone: data.timezone ?? "UTC",
        email: data.email ?? null,
        defaultLocale,
        baseCurrency: data.defaultCurrency,
        defaultCurrency: data.defaultCurrency,
        defaultWeightUnit: data.defaultWeightUnit ?? "kg",
        defaultDimensionUnit: data.defaultDimensionUnit ?? "cm",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();

    return result;
  }

  @ReadOnly()
  async findById(id: string): Promise<ProjectWithIntegrations | undefined> {
    const [result] = await this.connection
      .select()
      .from(project)
      .where(eq(project.id, id));

    if (!result) return undefined;
    return this.loadIntegrations(result);
  }

  @ReadOnly()
  async findBySlug(slug: string): Promise<ProjectWithIntegrations | undefined> {
    const [result] = await this.connection
      .select()
      .from(project)
      .where(eq(project.slug, slug));

    if (!result) return undefined;
    return this.loadIntegrations(result);
  }

  @ReadOnly()
  async getMany(): Promise<ProjectWithIntegrations[]> {
    const projects = await this.connection.select().from(project);
    return Promise.all(projects.map((p) => this.loadIntegrations(p)));
  }

  @Transactional()
  async update(id: string, data: UpdateProjectData): Promise<ProjectWithIntegrations | undefined> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.defaultWeightUnit !== undefined) updateData.defaultWeightUnit = data.defaultWeightUnit;
    if (data.defaultDimensionUnit !== undefined) updateData.defaultDimensionUnit = data.defaultDimensionUnit;

    const [result] = await this.connection
      .update(project)
      .set(updateData)
      .where(eq(project.id, id))
      .returning();

    if (!result) return undefined;
    return this.loadIntegrations(result);
  }
}
