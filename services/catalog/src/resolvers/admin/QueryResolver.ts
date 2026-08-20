import { GlobalIdEntity, type GlobalIdType } from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import type { CurrencyCode } from "@shopana/shared-references";
import { CatalogType } from "./CatalogType.js";
import type { ProductQueryProductsArgs } from "./ProductConnectionResolver.js";
import type { VendorConnectionInput } from "./VendorConnectionResolver.js";
import type { OptionCategoryConnectionInput } from "./OptionCategoryConnectionResolver.js";
import type { CategoryQueryCategoriesArgs } from "./CategoryConnectionResolver.js";
import type { TagConnectionInput } from "./TagConnectionResolver.js";
import type {
  VariantConnectionInput,
  WarehouseAssignableVariantConnectionInput,
} from "./VariantConnectionResolver.js";
import type { ProductBulkUpdateJobConnectionInput } from "./ProductBulkUpdateJobConnectionResolver.js";
import type { PricingWidgetInput } from "./PricingWidgetResolver.js";
import type { WarehouseConnectionResolverInput } from "./WarehouseConnectionResolver.js";
import type { InventoryItemConnectionResolverInput } from "./InventoryItemConnectionResolver.js";
import type { NormalizedInventoryItemWarehouseScope } from "../../repositories/inventory-item/InventoryItemRepository.js";
import {
  normalizeCategoryHierarchyScopeInput,
  normalizeCategoryProductsScopeInput,
  normalizeProductCategoriesScopeInput,
  normalizeWarehouseWhereInput,
} from "./filter-normalizers.js";

type InventoryItemWarehouseScopeArgs = {
  referenceIds?: string[] | null;
  mode?: "INCLUDE" | "EXCLUDE" | null;
};

type InventoryItemInventoryItemsMetaArgs = {
  warehouseScope?: InventoryItemWarehouseScopeArgs | null;
};

type InventoryItemsArgs = Omit<InventoryItemConnectionResolverInput, "meta"> & {
  meta?: InventoryItemInventoryItemsMetaArgs | null;
};

/**
 * Root Query resolver for Catalog Service.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends CatalogType<Record<string, never>> {
  /**
   * Entry point for catalog-related queries.
   * Returns namespace resolver that handles all catalog queries.
   */
  catalogQuery() {
    return this.resolvers.catalogQuery();
  }

  /**
   * Entry point for widget-related queries.
   */
  widgetQuery() {
    return this.resolvers.widgetQuery();
  }

  inventoryQuery() {
    return this.resolvers.inventoryQuery();
  }
}

/**
 * Widget query resolver for pricing.
 */
export class WidgetQueryResolver extends CatalogType<Record<string, never>> {
  inventory(args: { productId: string }) {
    const productId = this.decodeId(args.productId, GlobalIdEntity.Product);
    return this.resolvers.inventoryWidget(productId);
  }

  pricing(args: { input: PricingWidgetInput }) {
    const variantId = this.decodeId(args.input.variantId, GlobalIdEntity.Variant);

    return this.resolvers.pricingWidget({
      variantId,
      currency: args.input.currency as CurrencyCode,
      from: args.input.from,
      to: args.input.to,
      first: args.input.first,
      after: args.input.after,
    });
  }
}

/**
 * CatalogQuery namespace resolver.
 * Handles all catalog-related queries (products, variants).
 * Does NOT contain inventory queries (warehouses, stock).
 */
export class CatalogQueryResolver extends CatalogType<Record<string, never>> {
  private safeDecodeId(globalId: string, expectedType: GlobalIdType): string | null {
    try {
      return this.decodeId(globalId, expectedType);
    } catch {
      return null;
    }
  }

  // ---- Node Queries (Relay) ----

  /**
   * Get a node by ID (for Relay compatibility).
   */
  async node(args: { id: string }) {
    for (const [entity, loader] of [
      [
        GlobalIdEntity.ComparisonProfile,
        async (id: string) =>
          (await this.$ctx.loaders.comparisonProfile.load(id))
            ? this.resolvers.comparisonProfile(id)
            : null,
      ],
      [
        GlobalIdEntity.ComparisonGroup,
        async (id: string) => {
          const row = await this.$ctx.loaders.comparisonGroup.load(id);
          if (!row) return null;
          const { ComparisonGroupResolver } = await import("./ComparisonProfileResolver.js");
          return new ComparisonGroupResolver(row, this.$ctx);
        },
      ],
      [
        GlobalIdEntity.ComparisonField,
        async (id: string) => {
          const row = await this.$ctx.loaders.comparisonField.load(id);
          if (!row) return null;
          const { ComparisonFieldResolver } = await import("./ComparisonProfileResolver.js");
          return new ComparisonFieldResolver(row, this.$ctx);
        },
      ],
      [
        GlobalIdEntity.ComparisonFieldOption,
        async (id: string) => {
          const row = await this.$ctx.loaders.comparisonFieldOption.load(id);
          if (!row) return null;
          const field = await this.$ctx.loaders.comparisonField.load(row.fieldId);
          if (!field) return null;
          const { ComparisonFieldOptionResolver } = await import("./ComparisonProfileResolver.js");
          return new ComparisonFieldOptionResolver({ row, profileId: field.profileId }, this.$ctx);
        },
      ],
    ] as const) {
      const id = this.safeDecodeId(args.id, entity);
      if (id) return loader(id);
    }
    const productId = this.safeDecodeId(args.id, GlobalIdEntity.Product);
    if (!productId) return null;
    const product = await this.$ctx.loaders.product.load(productId);
    if (!product) return null;
    return this.resolvers.product(productId);
  }

  async comparisonProfile(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.ComparisonProfile);
    if (!id || !(await this.$ctx.loaders.comparisonProfile.load(id))) return null;
    return this.resolvers.comparisonProfile(id);
  }

  comparisonProfiles(args: Record<string, unknown>) {
    return this.resolvers.comparisonProfileConnection(args);
  }

  async productComparisonConfiguration(args: { productId: string }) {
    const id = this.safeDecodeId(args.productId, GlobalIdEntity.Product);
    if (!id || !(await this.$ctx.loaders.product.load(id))) {
      throw new GraphQLError("Product not found", { extensions: { code: "INVALID_ID" } });
    }
    return this.resolvers.productComparisonConfiguration(id);
  }

  /**
   * Get multiple nodes by IDs (for Relay compatibility).
   */
  nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  // ---- Product Queries ----

  /**
   * Get a single product by ID.
   * Returns null if product doesn't exist.
   */
  async product(args: { id: string }) {
    const productId = this.safeDecodeId(args.id, GlobalIdEntity.Product) ?? args.id;
    const product = await this.$ctx.loaders.product.load(productId);
    if (!product) {
      return null;
    }
    return this.resolvers.product(productId);
  }

  /**
   * Get a paginated list of products.
   */
  products(args: ProductQueryProductsArgs) {
    return this.resolvers.productConnection({
      ...args,
      meta: {
        categoriesScope: normalizeProductCategoriesScopeInput(args.meta?.categoriesScope),
      },
    });
  }

  // ---- Variant Queries ----

  /**
   * Get a single variant by ID.
   */
  async variant(args: { id: string }) {
    const variantId = this.safeDecodeId(args.id, GlobalIdEntity.Variant) ?? args.id;
    const variant = await this.$ctx.loaders.variant.load(variantId);
    if (!variant) {
      return null;
    }
    return this.resolvers.variant(variantId);
  }

  /**
   * Get a paginated list of variants.
   */
  variants(args: VariantConnectionInput) {
    return this.resolvers.variantConnection(args);
  }

  // ---- Vendor Queries ----

  /**
   * Get a single vendor by ID.
   * Returns null if vendor doesn't exist.
   */
  async vendor(args: { id: string }) {
    const vendorId = this.safeDecodeId(args.id, GlobalIdEntity.Vendor) ?? args.id;
    const vendor = await this.$ctx.loaders.vendor.load(vendorId);
    if (!vendor) {
      return null;
    }
    return this.resolvers.vendor(vendorId);
  }

  /**
   * Get a paginated list of vendors.
   */
  vendors(args: VendorConnectionInput) {
    return this.resolvers.vendorConnection(args);
  }

  async productOptionCategory(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.OptionCategory);
    if (!id) return null;
    const category = await this.$ctx.loaders.optionCategory.load(id);
    if (!category) return null;
    return this.resolvers.optionCategory(id);
  }

  productOptionCategories(args: OptionCategoryConnectionInput) {
    return this.resolvers.optionCategoryConnection(args);
  }

  // ---- Category Queries ----

  /**
   * Get a single category by ID.
   * Returns null if category doesn't exist.
   */
  async category(args: { id: string }) {
    const categoryId = this.safeDecodeId(args.id, GlobalIdEntity.Category);
    if (!categoryId) return null;
    const cat = await this.$ctx.loaders.category.load(categoryId);
    if (!cat) {
      return null;
    }
    return this.resolvers.category(categoryId);
  }

  /**
   * Get a paginated list of categories.
   */
  categories(args: CategoryQueryCategoriesArgs) {
    return this.resolvers.categoryConnection({
      ...args,
      meta: {
        hierarchyScope: normalizeCategoryHierarchyScopeInput(args.meta?.hierarchyScope),
        productsScope: normalizeCategoryProductsScopeInput(args.meta?.productsScope),
      },
    });
  }

  async collection(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.Collection);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.collection.findById(id);
    if (!item) return null;
    return this.resolvers.collection(item.id);
  }

  async collectionByHandle(args: { handle: string }) {
    const item = await this.$ctx.kernel.repository.collection.findByHandle(args.handle);
    if (!item) return null;
    return this.resolvers.collection(item.id);
  }

  // TODO: Implement collections() with keyset pagination

  // ---- Tag Queries ----

  /**
   * Get a single tag by ID.
   * Returns null if tag doesn't exist.
   */
  async tag(args: { id: string }) {
    const tagId = this.safeDecodeId(args.id, GlobalIdEntity.Tag) ?? args.id;
    const t = await this.$ctx.loaders.tag.load(tagId);
    if (!t) {
      return null;
    }
    return this.resolvers.tag(tagId);
  }

  /**
   * Get a paginated list of tags.
   */
  tags(args: TagConnectionInput) {
    return this.resolvers.tagConnection(args);
  }

  /**
   * Get a bulk update job by ID.
   */
  async productBulkUpdateJob(args: { jobId: string }) {
    const jobId = this.decodeId(args.jobId, GlobalIdEntity.ProductBulkUpdateJob);

    const job = await this.$ctx.kernel.repository.bulkEditJob.findById(jobId);
    if (!job) return null;
    return this.resolvers.productBulkUpdateJob(job.id);
  }

  productBulkUpdateJobs(args: ProductBulkUpdateJobConnectionInput) {
    return this.resolvers.productBulkUpdateJobConnection(args);
  }
}

export class InventoryQueryResolver extends CatalogType<Record<string, never>> {
  async node(args: { id: string }) {
    try {
      const warehouseId = this.decodeId(args.id, GlobalIdEntity.Warehouse);
      const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
      if (warehouse) {
        return this.resolvers.warehouse(warehouseId);
      }
    } catch {
      // Not a Warehouse ID
    }

    try {
      const inventoryItemId = this.decodeId(args.id, GlobalIdEntity.InventoryItem);
      const item = await this.$ctx.loaders.inventoryItem.load(inventoryItemId);
      if (item) {
        return this.resolvers.inventoryItem(item.id);
      }
    } catch {
      // Not an InventoryItem ID
    }

    try {
      const stockId = this.decodeId(args.id, GlobalIdEntity.WarehouseStock);
      const stock = await this.$ctx.kernel.repository.stock.findById(stockId);
      if (stock) {
        return this.resolvers.stock(stock.id);
      }
    } catch {
      // Not a WarehouseStock ID
    }

    return null;
  }

  nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async warehouse(args: { id: string }) {
    const warehouseId = this.decodeId(args.id, GlobalIdEntity.Warehouse);
    const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
    if (!warehouse) {
      return null;
    }
    return this.resolvers.warehouse(warehouseId);
  }

  warehouses(args: WarehouseConnectionResolverInput) {
    return this.resolvers.warehouseConnection({
      ...args,
      where: normalizeWarehouseWhereInput(args.where),
    });
  }

  async inventoryItem(args: { id: string }) {
    const itemId = this.decodeId(args.id, GlobalIdEntity.InventoryItem);
    const item = await this.$ctx.loaders.inventoryItem.load(itemId);
    if (!item) return null;
    return this.resolvers.inventoryItem(item.id);
  }

  async inventoryItemByVariant(args: { variantId: string }) {
    const variantUuid = this.decodeId(args.variantId, GlobalIdEntity.Variant);
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(variantUuid);
    if (!item) return null;
    return this.resolvers.inventoryItem(item.id);
  }

  async inventoryItems(args: InventoryItemsArgs) {
    const warehouseScope = await this.normalizeInventoryItemWarehouseScopeInput(
      args.meta?.warehouseScope,
    );

    if (warehouseScope.kind === "invalid") {
      throw new GraphQLError(warehouseScope.message, {
        extensions: { code: warehouseScope.code },
      });
    }

    return this.resolvers.inventoryItemConnection({
      ...args,
      meta: { warehouseScope },
    } as InventoryItemConnectionResolverInput);
  }

  async warehouseAssignableVariants(args: WarehouseAssignableVariantConnectionInput) {
    const warehouseId = this.decodeId(args.warehouseId, GlobalIdEntity.Warehouse);
    const warehouse = await this.$ctx.kernel.repository.warehouse.findById(warehouseId);

    return this.resolvers.warehouseAssignableVariantConnection({
      ...args,
      warehouseId,
      empty: !warehouse,
    });
  }

  private async normalizeInventoryItemWarehouseScopeInput(
    input: InventoryItemWarehouseScopeArgs | null | undefined,
  ): Promise<NormalizedInventoryItemWarehouseScope> {
    if (!input) {
      return { kind: "all" };
    }

    if (input.mode !== "INCLUDE") {
      return {
        kind: "invalid",
        code: "UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE",
        message: "Only warehouseScope mode INCLUDE is supported for inventoryItems.",
      };
    }

    const referenceIds = input.referenceIds ?? [];
    if (referenceIds.length !== 1) {
      return {
        kind: "invalid",
        code: "UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE",
        message: "inventoryItems supports exactly one warehouseScope referenceId.",
      };
    }

    let warehouseId: string;
    try {
      warehouseId = this.decodeId(referenceIds[0]!, GlobalIdEntity.Warehouse);
    } catch {
      return { kind: "empty" };
    }

    const warehouse = await this.$ctx.kernel.repository.warehouse.findById(warehouseId);
    if (!warehouse) {
      return { kind: "empty" };
    }

    return { kind: "warehouse", warehouseId };
  }
}
