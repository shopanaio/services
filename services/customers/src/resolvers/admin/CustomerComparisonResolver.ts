import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  CatalogComparisonActions,
  type Catalog,
} from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type {
  CustomerComparison,
  CustomerComparisonItem,
} from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerComparisonResolver extends CustomersType<
  string,
  CustomerComparison
> {
  async $preload(): Promise<CustomerComparison> {
    const comparison = await this.$ctx.loaders.comparison.load(this.$props);
    if (!comparison) {
      throw new PreloadNotFoundError("Customer comparison was not found");
    }
    return comparison;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerComparison);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  revision() {
    return this.$get("revision");
  }

  async items() {
    const items = await this.$ctx.loaders.comparisonItems.load(this.$props);
    return Promise.all(
      items.map((item) => this.resolvers.comparisonItem(item.id)),
    );
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}

export class CustomerComparisonItemResolver extends CustomersType<
  string,
  CustomerComparisonItem
> {
  private catalogVariantPromise?: Promise<
    Catalog.ResolvedCustomerComparisonVariant | null
  >;

  async $preload(): Promise<CustomerComparisonItem> {
    const item = await this.$ctx.loaders.comparisonItem.load(this.$props);
    if (!item) {
      throw new PreloadNotFoundError("Customer comparison item was not found");
    }
    return item;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerComparisonItem);
  }

  async comparison() {
    return this.resolvers.comparison(await this.$get("comparisonId"));
  }

  async productId() {
    return this.encodeId(await this.$get("productId"), GlobalIdEntity.Product);
  }

  async variantId() {
    return this.encodeId(await this.$get("variantId"), GlobalIdEntity.Variant);
  }

  async product() {
    const variant = await this.resolveCatalogVariant();
    if (!variant || variant.productId !== (await this.$get("productId"))) {
      return null;
    }
    return {
      __typename: "Product" as const,
      id: await this.productId(),
    };
  }

  async variant() {
    if (!(await this.resolveCatalogVariant())) return null;
    return {
      __typename: "Variant" as const,
      id: await this.variantId(),
    };
  }

  position() {
    return this.$get("position");
  }

  addedAt() {
    return this.$get("addedAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }

  private resolveCatalogVariant(): Promise<
    Catalog.ResolvedCustomerComparisonVariant | null
  > {
    this.catalogVariantPromise ??= this.loadCatalogVariant();
    return this.catalogVariantPromise;
  }

  private async loadCatalogVariant(): Promise<
    Catalog.ResolvedCustomerComparisonVariant | null
  > {
    const variantId = await this.$get("variantId");
    try {
      const result = await this.$ctx.kernel.getServices().broker.call<
        Catalog.ResolveCustomerComparisonVariantsResult,
        Catalog.ResolveCustomerComparisonVariantsParams
      >(CatalogComparisonActions.resolveVariants, {
        storeId: this.$ctx.store.id,
        variantIds: [variantId],
      });
      if (!result.ok) return null;
      return (
        result.variants.find((variant) => variant.variantId === variantId) ?? null
      );
    } catch {
      return null;
    }
  }
}
