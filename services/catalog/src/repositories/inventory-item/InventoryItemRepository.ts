import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Catalog } from "@shopana/broker-types";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  inventoryItem,
  inventoryItemCatalogProjection,
  inventoryItemListAllStockView,
  inventoryItemListWarehouseStockView,
  inventoryProductTranslation,
  type InventoryItem,
  type NewInventoryItemCatalogProjection,
  type NewInventoryItem,
  type NewInventoryProductTranslation,
} from "../models/index.js";
import {
  decodeInventoryItemGlobalId,
  decodeProductGlobalId,
  decodeVariantGlobalId,
} from "../global-id-where-mappers.js";

export const inventoryItemAllStockRelayQuery = createRelayQuery(
  createQuery(inventoryItemListAllStockView)
    .include(["id", "variantId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" }
);

export const inventoryItemWarehouseStockRelayQuery = createRelayQuery(
  createQuery(inventoryItemListWarehouseStockView)
    .include(["id", "variantId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" }
);

export type InventoryItemListRelayInput = InferRelayInput<
  typeof inventoryItemAllStockRelayQuery
>;
type InventoryItemWarehouseListRelayInput = InferRelayInput<
  typeof inventoryItemWarehouseStockRelayQuery
>;

export type NormalizedInventoryItemWarehouseScope =
  | { kind: "all" }
  | { kind: "empty" }
  | { kind: "warehouse"; warehouseId: string }
  | { kind: "invalid"; code: string; message: string };

export type InventoryItemConnectionMetaInput = {
  warehouseScope?: NormalizedInventoryItemWarehouseScope;
};

export type InventoryItemConnectionInput = InventoryItemListRelayInput & {
  meta?: InventoryItemConnectionMetaInput;
};

export interface InventoryItemConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

const EMPTY_PAGE_INFO: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

function emptyInventoryItemConnection(): InventoryItemConnectionResult {
  return {
    edges: [],
    pageInfo: EMPTY_PAGE_INFO,
    totalCount: 0,
  };
}

const inventoryItemSelectColumns = {
  id: inventoryItem.id,
  projectId: inventoryItem.projectId,
  variantId: inventoryItem.variantId,
  sku: inventoryItem.sku,
  trackInventory: inventoryItem.trackInventory,
  continueSellingWhenOutOfStock: inventoryItem.continueSellingWhenOutOfStock,
  createdAt: inventoryItem.createdAt,
  updatedAt: inventoryItem.updatedAt,
};

/**
 * InventoryItemRepository - manages InventoryItem entities.
 *
 * InventoryItem has a 1:1 relationship with Variant from Catalog service.
 * This repository provides methods to:
 * - Create/update/delete inventory items
 * - Lookup by ID or variantId
 * - Manage SKU and inventory tracking settings
 */
export class InventoryItemRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  // ============ CRUD ============

  async create(data: {
    variantId: string;
    sku?: string | null;
    trackInventory?: boolean;
    continueSellingWhenOutOfStock?: boolean;
  }): Promise<InventoryItem> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newItem: NewInventoryItem = {
      id,
      projectId: this.storeId,
      variantId: data.variantId,
      sku: data.sku ?? null,
      trackInventory: data.trackInventory ?? true,
      continueSellingWhenOutOfStock: data.continueSellingWhenOutOfStock ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(inventoryItem)
      .values(newItem)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: {
      sku?: string | null;
      trackInventory?: boolean;
      continueSellingWhenOutOfStock?: boolean;
    }
  ): Promise<InventoryItem | null> {
    const updateData: Partial<NewInventoryItem> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.trackInventory !== undefined) updateData.trackInventory = data.trackInventory;
    if (data.continueSellingWhenOutOfStock !== undefined) {
      updateData.continueSellingWhenOutOfStock = data.continueSellingWhenOutOfStock;
    }

    const result = await this.connection
      .update(inventoryItem)
      .set(updateData)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id)
        )
      )
      .returning({ id: inventoryItem.id });

    return result.length > 0;
  }

  // ============ Lookup ============

  async findById(id: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByVariantId(variantId: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.variantId, variantId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findActiveById(id: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select(inventoryItemSelectColumns)
      .from(inventoryItem)
      .innerJoin(
        inventoryItemCatalogProjection,
        and(
          eq(inventoryItemCatalogProjection.projectId, inventoryItem.projectId),
          eq(inventoryItemCatalogProjection.variantId, inventoryItem.variantId)
        )
      )
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id),
          isNull(inventoryItemCatalogProjection.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findActiveByVariantId(variantId: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select(inventoryItemSelectColumns)
      .from(inventoryItem)
      .innerJoin(
        inventoryItemCatalogProjection,
        and(
          eq(inventoryItemCatalogProjection.projectId, inventoryItem.projectId),
          eq(inventoryItemCatalogProjection.variantId, inventoryItem.variantId)
        )
      )
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.variantId, variantId),
          isNull(inventoryItemCatalogProjection.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findActiveByIds(ids: readonly string[]): Promise<InventoryItem[]> {
    if (ids.length === 0) return [];

    return this.connection
      .select(inventoryItemSelectColumns)
      .from(inventoryItem)
      .innerJoin(
        inventoryItemCatalogProjection,
        and(
          eq(inventoryItemCatalogProjection.projectId, inventoryItem.projectId),
          eq(inventoryItemCatalogProjection.variantId, inventoryItem.variantId)
        )
      )
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          inArray(inventoryItem.id, [...ids]),
          isNull(inventoryItemCatalogProjection.deletedAt)
        )
      );
  }

  async findActiveByVariantIds(
    variantIds: readonly string[]
  ): Promise<InventoryItem[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select(inventoryItemSelectColumns)
      .from(inventoryItem)
      .innerJoin(
        inventoryItemCatalogProjection,
        and(
          eq(inventoryItemCatalogProjection.projectId, inventoryItem.projectId),
          eq(inventoryItemCatalogProjection.variantId, inventoryItem.variantId)
        )
      )
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          inArray(inventoryItem.variantId, [...variantIds]),
          isNull(inventoryItemCatalogProjection.deletedAt)
        )
      );
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.sku, sku)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  // ============ Connection ============

  async getConnection(
    args: InventoryItemConnectionInput
  ): Promise<InventoryItemConnectionResult> {
    const { where, orderBy, meta, ...paginationArgs } = args;
    const warehouseScope = meta?.warehouseScope ?? { kind: "all" };

    if (warehouseScope.kind === "invalid") {
      throw new Error(warehouseScope.message);
    }

    if (warehouseScope.kind === "empty") {
      return emptyInventoryItemConnection();
    }

    const baseWhere = [
      { projectId: { _eq: this.storeId } },
      { locale: { _eq: this.locale } },
      { deletedAt: { _is: null } },
      ...(where ? [where] : []),
    ];

    const defaultOrderBy: NonNullable<InventoryItemListRelayInput["orderBy"]> = [
      { field: "productName", direction: "asc" },
    ];

    if (warehouseScope.kind === "warehouse") {
      const mergedWhere: InventoryItemWarehouseListRelayInput["where"] = {
        _and: [
          ...baseWhere,
          { warehouseScopeId: { _eq: warehouseScope.warehouseId } },
        ] as InventoryItemWarehouseListRelayInput["where"][],
      };
      const executeInput: InventoryItemWarehouseListRelayInput = {
        ...paginationArgs,
        where: mergedWhere,
        orderBy:
          (orderBy as InventoryItemWarehouseListRelayInput["orderBy"]) ??
          defaultOrderBy,
      };

      const [result, totalCount] = await Promise.all([
        inventoryItemWarehouseStockRelayQuery.execute(
          this.connection,
          executeInput
        ),
        inventoryItemWarehouseStockRelayQuery.count(this.connection, {
          where: mergedWhere,
        }),
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

    const mergedWhere: InventoryItemListRelayInput["where"] = {
      _and: baseWhere as InventoryItemListRelayInput["where"][],
    };
    const executeInput: InventoryItemListRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? defaultOrderBy,
    };

    const [result, totalCount] = await Promise.all([
      inventoryItemAllStockRelayQuery.execute(this.connection, executeInput),
      inventoryItemAllStockRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
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

  // ============ Batch Loaders ============

  async findByIds(ids: readonly string[]): Promise<InventoryItem[]> {
    if (ids.length === 0) return [];

    return this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          inArray(inventoryItem.id, [...ids])
        )
      );
  }

  async findByVariantIds(variantIds: readonly string[]): Promise<InventoryItem[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          inArray(inventoryItem.variantId, [...variantIds])
        )
      );
  }

  // ============ Upsert (for event handlers) ============

  /**
   * Create or update inventory item for a variant.
   * Used when receiving variant.created events from Catalog.
   */
  async upsertByVariantId(
    variantId: string,
    data: {
      sku?: string | null;
      trackInventory?: boolean;
      continueSellingWhenOutOfStock?: boolean;
    }
  ): Promise<InventoryItem> {
    const existing = await this.findByVariantId(variantId);

    if (existing) {
      const updated = await this.update(existing.id, data);
      return updated!;
    }

    return this.create({
      variantId,
      ...data,
    });
  }

  // ============ Catalog projection sync ============

  async upsertCatalogProjectionSnapshot(
    snapshot: Catalog.InventoryItemProjectionSnapshot,
    eventId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const deletedAt = snapshot.deletedAt ?? null;

    await this.upsertCatalogProjectionRows(
      snapshot.variants.map((variantSnapshot) => ({
        projectId: this.storeId,
        variantId: variantSnapshot.variantId,
        productId: snapshot.productId,
        productHandle: snapshot.productHandle,
        externalSystem: variantSnapshot.externalSystem,
        externalId: variantSnapshot.externalId,
        catalogRevision: snapshot.revision,
        lastCatalogEventId: eventId ?? null,
        deletedAt: variantSnapshot.deletedAt ?? deletedAt,
        updatedAt: now,
      }))
    );

    await this.upsertProductTranslations(
      snapshot.translations.map((translation) => ({
        projectId: this.storeId,
        productId: translation.productId,
        locale: translation.locale,
        name: translation.name,
      }))
    );
  }

  async upsertCatalogProjectionRows(
    rows: NewInventoryItemCatalogProjection[]
  ): Promise<void> {
    if (rows.length === 0) return;

    await this.connection
      .insert(inventoryItemCatalogProjection)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          inventoryItemCatalogProjection.projectId,
          inventoryItemCatalogProjection.variantId,
        ],
        set: {
          productId: sql`excluded.product_id`,
          productHandle: sql`excluded.product_handle`,
          externalSystem: sql`excluded.external_system`,
          externalId: sql`excluded.external_id`,
          catalogRevision: sql`excluded.catalog_revision`,
          lastCatalogEventId: sql`excluded.last_catalog_event_id`,
          deletedAt: sql`excluded.deleted_at`,
          updatedAt: sql`excluded.updated_at`,
        },
        setWhere: sql`
          ${inventoryItemCatalogProjection.catalogRevision} IS NULL
          OR excluded.catalog_revision IS NULL
          OR excluded.catalog_revision >= ${inventoryItemCatalogProjection.catalogRevision}
        `,
      });
  }

  async upsertProductTranslations(
    translations: NewInventoryProductTranslation[]
  ): Promise<void> {
    if (translations.length === 0) return;

    await this.connection
      .insert(inventoryProductTranslation)
      .values(translations)
      .onConflictDoUpdate({
        target: [
          inventoryProductTranslation.productId,
          inventoryProductTranslation.locale,
        ],
        set: {
          projectId: sql`excluded.project_id`,
          name: sql`excluded.name`,
        },
      });
  }

  async softDeleteCatalogProjectionByProductId(
    productId: string,
    eventId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const updateData: Partial<NewInventoryItemCatalogProjection> = {
      deletedAt: now,
      updatedAt: now,
    };
    if (eventId) {
      updateData.lastCatalogEventId = eventId;
    }

    await this.connection
      .update(inventoryItemCatalogProjection)
      .set(updateData)
      .where(
        and(
          eq(inventoryItemCatalogProjection.projectId, this.storeId),
          eq(inventoryItemCatalogProjection.productId, productId)
        )
      );
  }

  async softDeleteCatalogProjectionByVariantId(
    variantId: string,
    eventId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const updateData: Partial<NewInventoryItemCatalogProjection> = {
      deletedAt: now,
      updatedAt: now,
    };
    if (eventId) {
      updateData.lastCatalogEventId = eventId;
    }

    await this.connection
      .update(inventoryItemCatalogProjection)
      .set(updateData)
      .where(
        and(
          eq(inventoryItemCatalogProjection.projectId, this.storeId),
          eq(inventoryItemCatalogProjection.variantId, variantId)
        )
      );
  }
}
