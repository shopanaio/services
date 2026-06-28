import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";
import { BundleResolver } from "./BundleResolver.js";

/**
 * Safely decode a global ID, returning null if invalid
 */
function safeDecodeGlobalId(
  globalId: string,
  expectedType: GlobalIdType
): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}
import {
  ProductConnectionResolver,
  type ProductQueryProductsArgs,
} from "./ProductConnectionResolver.js";
import { VariantResolver } from "./VariantResolver.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { VendorResolver } from "./VendorResolver.js";
import {
  VendorConnectionResolver,
  type VendorConnectionInput,
} from "./VendorConnectionResolver.js";
import { TagResolver } from "./TagResolver.js";
import { CollectionResolver } from "./CollectionResolver.js";
import { FacetGroupResolver } from "./FacetGroupResolver.js";
import { FacetResolver } from "./FacetResolver.js";
import { FacetValueResolver } from "./FacetValueResolver.js";
import { FacetSwatchResolver } from "./FacetSwatchResolver.js";
import {
  CategoryConnectionResolver,
  type CategoryQueryCategoriesArgs,
} from "./CategoryConnectionResolver.js";
import {
  TagConnectionResolver,
  type TagConnectionInput,
} from "./TagConnectionResolver.js";
import {
  VariantConnectionResolver,
  type VariantConnectionInput,
  WarehouseAssignableVariantConnectionResolver,
  type WarehouseAssignableVariantConnectionInput,
} from "./VariantConnectionResolver.js";
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import {
  ProductBulkUpdateJobConnectionResolver,
  type ProductBulkUpdateJobConnectionInput,
} from "./ProductBulkUpdateJobConnectionResolver.js";
import {
  PricingWidgetResolver,
  type PricingWidgetInput,
} from "./PricingWidgetResolver.js";
import { InventoryWidgetResolver } from "./InventoryWidgetResolver.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";
import {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";
import {
  InventoryItemConnectionResolver,
  type InventoryItemConnectionResolverInput,
} from "./InventoryItemConnectionResolver.js";
import type { NormalizedInventoryItemWarehouseScope } from "../../repositories/inventory-item/InventoryItemRepository.js";
import {
  normalizeCategoryHierarchyScopeInput,
  normalizeCategoryProductsScopeInput,
  normalizeProductCategoriesScopeInput,
  normalizeWarehouseWhereInput,
} from "./filter-normalizers.js";
import { CollectionRulesPreviewCountScript } from "../../scripts/collection/CollectionRulesPreviewCountScript.js";

type InventoryItemWarehouseScopeArgs = {
  referenceIds?: string[] | null;
  mode?: "INCLUDE" | "EXCLUDE" | null;
};

type InventoryItemInventoryItemsMetaArgs = {
  warehouseScope?: InventoryItemWarehouseScopeArgs | null;
};

type InventoryItemsArgs = Omit<
  InventoryItemConnectionResolverInput,
  "meta"
> & {
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
    return new CatalogQueryResolver({}, this.$ctx);
  }

  /**
   * Entry point for widget-related queries.
   */
  widgetQuery() {
    return new WidgetQueryResolver({}, this.$ctx);
  }

  inventoryQuery() {
    return new InventoryQueryResolver({}, this.$ctx);
  }
}

/**
 * Widget query resolver for pricing.
 */
export class WidgetQueryResolver extends CatalogType<Record<string, never>> {
  inventory(args: { productId: string }) {
    const productId = decodeGlobalIdByType(
      args.productId,
      GlobalIdEntity.Product
    );
    return new InventoryWidgetResolver(productId, this.$ctx);
  }

  pricing(args: { input: PricingWidgetInput }) {
    const variantId = decodeGlobalIdByType(
      args.input.variantId,
      GlobalIdEntity.Variant
    );

    return new PricingWidgetResolver(
      {
        variantId,
        currency: args.input.currency as "UAH" | "USD" | "EUR",
        from: args.input.from,
        to: args.input.to,
        first: args.input.first,
        after: args.input.after,
      },
      this.$ctx
    );
  }
}

/**
 * CatalogQuery namespace resolver.
 * Handles all catalog-related queries (products, variants).
 * Does NOT contain inventory queries (warehouses, stock).
 */
export class CatalogQueryResolver extends CatalogType<Record<string, never>> {
  // ---- Node Queries (Relay) ----

  /**
   * Get a node by ID (for Relay compatibility).
   */
  async node(args: { id: string }) {
    const productId = safeDecodeGlobalId(args.id, GlobalIdEntity.Product);
    if (!productId) return null;
    const product = await this.$ctx.loaders.product.load(productId);
    if (!product) return null;
    return product.kind === "BUNDLE"
      ? new BundleResolver(productId, this.$ctx)
      : new ProductResolver(productId, this.$ctx);
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
    const productId =
      safeDecodeGlobalId(args.id, GlobalIdEntity.Product) ?? args.id;
    const product = await this.$ctx.loaders.product.load(productId);
    if (!product) {
      return null;
    }
    return new ProductResolver(productId, this.$ctx);
  }

  /**
   * Get a paginated list of products.
   */
  products(args: ProductQueryProductsArgs) {
    return new ProductConnectionResolver(
      {
        ...args,
        meta: {
          categoriesScope: normalizeProductCategoriesScopeInput(
            args.meta?.categoriesScope
          ),
        },
      },
      this.$ctx
    );
  }

  // ---- Variant Queries ----

  /**
   * Get a single variant by ID.
   */
  async variant(args: { id: string }) {
    const variantId =
      safeDecodeGlobalId(args.id, GlobalIdEntity.Variant) ?? args.id;
    const variant = await this.$ctx.loaders.variant.load(variantId);
    if (!variant) {
      return null;
    }
    return new VariantResolver(variantId, this.$ctx);
  }

  /**
   * Get a paginated list of variants.
   */
  variants(args: VariantConnectionInput) {
    return new VariantConnectionResolver(args, this.$ctx);
  }

  // ---- Vendor Queries ----

  /**
   * Get a single vendor by ID.
   * Returns null if vendor doesn't exist.
   */
  async vendor(args: { id: string }) {
    const vendorId =
      safeDecodeGlobalId(args.id, GlobalIdEntity.Vendor) ?? args.id;
    const vendor = await this.$ctx.loaders.vendor.load(vendorId);
    if (!vendor) {
      return null;
    }
    return new VendorResolver(vendorId, this.$ctx);
  }

  /**
   * Get a paginated list of vendors.
   */
  vendors(args: VendorConnectionInput) {
    return new VendorConnectionResolver(args, this.$ctx);
  }

  // ---- Category Queries ----

  /**
   * Get a single category by ID.
   * Returns null if category doesn't exist.
   */
  async category(args: { id: string }) {
    const categoryId = safeDecodeGlobalId(args.id, GlobalIdEntity.Category);
    if (!categoryId) return null;
    const cat = await this.$ctx.loaders.category.load(categoryId);
    if (!cat) {
      return null;
    }
    return new CategoryResolver(categoryId, this.$ctx);
  }

  /**
   * Get a paginated list of categories.
   */
  categories(args: CategoryQueryCategoriesArgs) {
    return new CategoryConnectionResolver(
      {
        ...args,
        meta: {
          hierarchyScope: normalizeCategoryHierarchyScopeInput(
            args.meta?.hierarchyScope
          ),
          productsScope: normalizeCategoryProductsScopeInput(
            args.meta?.productsScope
          ),
        },
      },
      this.$ctx
    );
  }

  async facetGroup(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetGroup);
    if (!id) return null;
    const group = await this.$ctx.kernel.repository.facetGroup.findById(id);
    if (!group) return null;
    return new FacetGroupResolver(group.id, this.$ctx);
  }

  async facetGroups() {
    const groups = await this.$ctx.kernel.repository.facetGroup.findAll();
    return groups.map((group) => new FacetGroupResolver(group.id, this.$ctx));
  }

  async facet(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.Facet);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facet.findById(id);
    if (!item) return null;
    return new FacetResolver(item.id, this.$ctx);
  }

  async facets() {
    const facets = await this.$ctx.kernel.repository.facet.findAll();
    return facets.map((item) => new FacetResolver(item.id, this.$ctx));
  }

  async facetValue(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetValue);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetValue.findById(id);
    if (!item) return null;
    return new FacetValueResolver(item.id, this.$ctx);
  }

  async facetValues(args: { facetId: string }) {
    const facetId = safeDecodeGlobalId(args.facetId, GlobalIdEntity.Facet);
    if (!facetId) return [];
    const values = await this.$ctx.kernel.repository.facetValue.findByFacetId(
      facetId
    );
    return values.map((item) => new FacetValueResolver(item.id, this.$ctx));
  }

  async facetSwatch(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetSwatch);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetSwatch.findById(id);
    if (!item) return null;
    return new FacetSwatchResolver(item.id, this.$ctx);
  }

  async facetSwatches() {
    const items = await this.$ctx.kernel.repository.facetSwatch.findAll();
    return items.map((item) => new FacetSwatchResolver(item.id, this.$ctx));
  }

  async collection(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.Collection);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.collection.findById(id);
    if (!item) return null;
    return new CollectionResolver(item.id, this.$ctx);
  }

  async collectionByHandle(args: { handle: string }) {
    const item = await this.$ctx.kernel.repository.collection.findByHandle(args.handle);
    if (!item) return null;
    return new CollectionResolver(item.id, this.$ctx);
  }

  // TODO: Implement collections() with keyset pagination

  async collectionRulesPreviewCount(args: {
    rules: Array<{ field: string; operator: string; value: unknown }>;
  }) {
    const result = await this.$ctx.kernel.runScript(CollectionRulesPreviewCountScript, {
      rules: args.rules,
    });
    return result.count;
  }

  // ---- Tag Queries ----

  /**
   * Get a single tag by ID.
   * Returns null if tag doesn't exist.
   */
  async tag(args: { id: string }) {
    const tagId = safeDecodeGlobalId(args.id, GlobalIdEntity.Tag) ?? args.id;
    const t = await this.$ctx.loaders.tag.load(tagId);
    if (!t) {
      return null;
    }
    return new TagResolver(tagId, this.$ctx);
  }

  /**
   * Get a paginated list of tags.
   */
  tags(args: TagConnectionInput) {
    return new TagConnectionResolver(args, this.$ctx);
  }

  /**
   * Get a bulk update job by ID.
   */
  async productBulkUpdateJob(args: { jobId: string }) {
    const jobId = decodeGlobalIdByType(
      args.jobId,
      GlobalIdEntity.ProductBulkUpdateJob
    );

    const job = await this.$ctx.kernel.repository.bulkEditJob.findById(jobId);
    if (!job) return null;
    return new ProductBulkUpdateJobResolver(job.id, this.$ctx);
  }

  productBulkUpdateJobs(args: ProductBulkUpdateJobConnectionInput) {
    return new ProductBulkUpdateJobConnectionResolver(args, this.$ctx);
  }
}

export class InventoryQueryResolver extends CatalogType<Record<string, never>> {
  async node(args: { id: string }) {
    try {
      const warehouseId = decodeGlobalIdByType(
        args.id,
        GlobalIdEntity.Warehouse
      );
      const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
      if (warehouse) {
        return new WarehouseResolver(warehouseId, this.$ctx);
      }
    } catch {
      // Not a Warehouse ID
    }

    try {
      const inventoryItemId = decodeGlobalIdByType(
        args.id,
        GlobalIdEntity.InventoryItem
      );
      const item = await this.$ctx.loaders.inventoryItem.load(inventoryItemId);
      if (item) {
        return new InventoryItemResolver(item.id, this.$ctx);
      }
    } catch {
      // Not an InventoryItem ID
    }

    try {
      const stockId = decodeGlobalIdByType(
        args.id,
        GlobalIdEntity.WarehouseStock
      );
      const stock = await this.$ctx.kernel.repository.stock.findById(stockId);
      if (stock) {
        return new StockResolver(stock.id, this.$ctx);
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
    const warehouseId = decodeGlobalIdByType(args.id, GlobalIdEntity.Warehouse);
    const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
    if (!warehouse) {
      return null;
    }
    return new WarehouseResolver(warehouseId, this.$ctx);
  }

  warehouses(args: WarehouseConnectionResolverInput) {
    return new WarehouseConnectionResolver(
      {
        ...args,
        where: normalizeWarehouseWhereInput(args.where),
      },
      this.$ctx
    );
  }

  async inventoryItem(args: { id: string }) {
    const itemId = decodeGlobalIdByType(args.id, GlobalIdEntity.InventoryItem);
    const item = await this.$ctx.loaders.inventoryItem.load(itemId);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  async inventoryItemByVariant(args: { variantId: string }) {
    const variantUuid = decodeGlobalIdByType(
      args.variantId,
      GlobalIdEntity.Variant
    );
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(variantUuid);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  async inventoryItems(args: InventoryItemsArgs) {
    const warehouseScope = await this.normalizeInventoryItemWarehouseScopeInput(
      args.meta?.warehouseScope
    );

    if (warehouseScope.kind === "invalid") {
      throw new GraphQLError(warehouseScope.message, {
        extensions: { code: warehouseScope.code },
      });
    }

    return new InventoryItemConnectionResolver(
      {
        ...args,
        meta: { warehouseScope },
      } as InventoryItemConnectionResolverInput,
      this.$ctx
    );
  }

  async warehouseAssignableVariants(
    args: WarehouseAssignableVariantConnectionInput
  ) {
    const warehouseId = decodeGlobalIdByType(
      args.warehouseId,
      GlobalIdEntity.Warehouse
    );
    const warehouse = await this.$ctx.kernel.repository.warehouse.findById(
      warehouseId
    );

    return new WarehouseAssignableVariantConnectionResolver(
      {
        ...args,
        warehouseId,
        empty: !warehouse,
      },
      this.$ctx
    );
  }

  private async normalizeInventoryItemWarehouseScopeInput(
    input: InventoryItemWarehouseScopeArgs | null | undefined
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
      warehouseId = decodeGlobalIdByType(
        referenceIds[0]!,
        GlobalIdEntity.Warehouse
      );
    } catch {
      return { kind: "empty" };
    }

    const warehouse = await this.$ctx.kernel.repository.warehouse.findById(
      warehouseId
    );
    if (!warehouse) {
      return { kind: "empty" };
    }

    return { kind: "warehouse", warehouseId };
  }
}
