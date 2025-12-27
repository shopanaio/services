import { eq } from "drizzle-orm";
import type { PageInfo } from "@shopana/drizzle-query";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  store,
  locale,
  currency,
  storeIntegration,
  type StoreRecord,
  type StoreIntegration,
  type StoreStatus,
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
  status: StoreIntegration["status"];
  config: TConfig;
}

/**
 * Store with loaded integrations - main Store type used throughout the app
 */
export interface Store extends StoreRecord {
  integrations: {
    payment?: IntegrationInfo;
    shipping?: IntegrationInfo;
    storage?: IntegrationInfo;
    email?: IntegrationInfo;
    analytics?: IntegrationInfo;
  };
}

export interface StoreQueryInput {}
export interface StoreRelayInput {}

export interface StoreConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CreateStoreData {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string | null;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export interface UpdateStoreData {
  name?: string;
  email?: string | null;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export class StoreRepository extends BaseRepository {
  /**
   * Load integrations for a store and attach to store object
   */
  private async loadIntegrations(storeRecord: StoreRecord): Promise<Store> {
    const integrations = await this.connection
      .select()
      .from(storeIntegration)
      .where(eq(storeIntegration.storeId, storeRecord.id));

    const result: Store = {
      ...storeRecord,
      integrations: {},
    };

    for (const integration of integrations) {
      const info = {
        provider: integration.provider,
        status: integration.status,
        config: integration.config,
      };

      switch (integration.type) {
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
   * Create a new store with locales and default currency.
   */
  @Transactional()
  async create(data: CreateStoreData): Promise<StoreRecord> {
    const now = new Date();
    const defaultLocale = data.locales[0];

    // 1. Create locale records first (required by store FK)
    for (const localeCode of data.locales) {
      await this.connection.insert(locale).values({
        storeId: data.id,
        code: localeCode,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Create currency records (required by store FK)
    for (const currencyCode of data.currencies) {
      await this.connection.insert(currency).values({
        storeId: data.id,
        code: currencyCode,
        isActive: true,
        exchangeRateAmount: BigInt(1),
        exchangeRateScale: 0,
        exchangeRate: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Create store (now FK references exist)
    const [result] = await this.connection
      .insert(store)
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
  async findById(id: string): Promise<Store | null> {
    const [result] = await this.connection
      .select()
      .from(store)
      .where(eq(store.id, id));

    if (!result) return null;

    return this.loadIntegrations(result);
  }

  @ReadOnly()
  async findBySlug(slug: string): Promise<Store | null> {
    const [result] = await this.connection
      .select()
      .from(store)
      .where(eq(store.slug, slug));

    if (!result) return null;
    return this.loadIntegrations(result);
  }

  @ReadOnly()
  async getMany(): Promise<Store[]> {
    const stores = await this.connection.select().from(store);
    return Promise.all(stores.map((s) => this.loadIntegrations(s)));
  }

  @ReadOnly()
  async getIdsByOrganization(organizationId: string): Promise<string[]> {
    const stores = await this.connection
      .select({ id: store.id })
      .from(store)
      .where(eq(store.organizationId, organizationId));
    return stores.map((s) => s.id);
  }

  @ReadOnly()
  async findByOrganization(organizationId: string): Promise<Store[]> {
    const stores = await this.connection
      .select()
      .from(store)
      .where(eq(store.organizationId, organizationId));
    return Promise.all(stores.map((s) => this.loadIntegrations(s)));
  }

  @Transactional()
  async update(id: string, data: UpdateStoreData): Promise<Store | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.defaultWeightUnit !== undefined)
      updateData.defaultWeightUnit = data.defaultWeightUnit;
    if (data.defaultDimensionUnit !== undefined)
      updateData.defaultDimensionUnit = data.defaultDimensionUnit;

    const [result] = await this.connection
      .update(store)
      .set(updateData)
      .where(eq(store.id, id))
      .returning();

    if (!result) return null;
    return this.loadIntegrations(result);
  }
}
