import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
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
    return {
      __typename: "Product" as const,
      id: await this.productId(),
    };
  }

  async variant() {
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
}
