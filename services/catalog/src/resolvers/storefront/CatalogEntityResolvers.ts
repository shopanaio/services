import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  InventoryItem,
  ProductFeature,
  ProductFeatureValue,
  ProductOption,
  ProductOptionCategory,
  ProductOptionValue,
  ProductOptionSwatch,
  Tag,
  Vendor,
} from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { inventoryState, isPublishedProduct, loadPublishedVariant } from "./helpers.js";
import { mediaReference } from "./MediaConnectionResolver.js";

@SubgraphReference()
export class VendorResolver extends CatalogType<string, Vendor> {
  async $preload() {
    const value = await this.$ctx.loaders.vendor.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Vendor not found");
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Vendor);
  }

  name() {
    return this.$get("name");
  }
}

@SubgraphReference()
export class TagResolver extends CatalogType<string, Tag> {
  async $preload() {
    const value = await this.$ctx.loaders.tag.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Tag not found");
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Tag);
  }

  handle() {
    return this.$get("handle");
  }

  async name() {
    const translation = await this.$ctx.loaders.tagTranslation.load(this.$props);
    return translation?.name ?? (await this.$get("handle"));
  }
}

@SubgraphReference()
export class ProductOptionResolver extends CatalogType<string, ProductOption> {
  async $preload() {
    const value = await this.$ctx.loaders.productOption.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Product option not found");
    const product = await this.$ctx.loaders.product.load(value.productId);
    if (!isPublishedProduct(product)) {
      throw new PreloadNotFoundError("Product option not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Option);
  }

  handle() {
    return this.$get("slug");
  }

  async name() {
    const translation = await this.$ctx.loaders.optionTranslation.load(this.$props);
    return translation?.name ?? (await this.$get("slug"));
  }

  async category() {
    return this.resolvers.productOptionCategory(await this.$get("categoryId"));
  }

  position() {
    return this.$get("sortIndex");
  }

  async optionValues() {
    const ids = await this.$ctx.loaders.optionValueIds.load(this.$props);
    return Promise.all(ids.map((id) => this.resolvers.productOptionValue(id)));
  }
}

@SubgraphReference()
export class ProductOptionCategoryResolver extends CatalogType<string, ProductOptionCategory> {
  async $preload() {
    const value = await this.$ctx.loaders.optionCategory.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Product option category not found");
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OptionCategory);
  }

  name() {
    return this.$get("name");
  }

  handle() {
    return this.$get("slug");
  }
}

@SubgraphReference()
export class ProductOptionValueResolver extends CatalogType<string, ProductOptionValue> {
  async $preload() {
    const value = await this.$ctx.loaders.optionValue.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Product option value not found");
    const option = await this.$ctx.loaders.productOption.load(value.optionId);
    const product = option ? await this.$ctx.loaders.product.load(option.productId) : null;
    if (!option || !isPublishedProduct(product)) {
      throw new PreloadNotFoundError("Product option value not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OptionValue);
  }

  handle() {
    return this.$get("slug");
  }

  async name() {
    const translation = await this.$ctx.loaders.optionValueTranslation.load(this.$props);
    return translation?.name ?? (await this.$get("slug"));
  }

  position() {
    return this.$get("sortIndex");
  }

  async swatch() {
    const swatchId = await this.$get("swatchId");
    if (!swatchId) return null;
    const swatch = await this.$ctx.loaders.swatch.load(swatchId);
    return swatch ? new ProductOptionValueSwatchResolver(swatch, this.$ctx) : null;
  }
}

export class ProductOptionValueSwatchResolver extends CatalogType<
  ProductOptionSwatch,
  ProductOptionSwatch
> {
  $preload() {
    return Promise.resolve(this.$props);
  }

  type() {
    return this.$props.swatchType.toUpperCase();
  }

  color() {
    return this.$props.colorOne;
  }

  secondaryColor() {
    return this.$props.colorTwo;
  }

  image() {
    return this.$props.imageId ? mediaReference(this.$props.imageId) : null;
  }

  metadata() {
    return this.$props.metadata;
  }
}

abstract class BaseFeatureResolver extends CatalogType<string, ProductFeature> {
  async $preload() {
    const value = await this.$ctx.loaders.productFeature.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Product feature not found");
    const product = await this.$ctx.loaders.product.load(value.productId);
    if (!isPublishedProduct(product)) {
      throw new PreloadNotFoundError("Product feature not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Feature);
  }

  handle() {
    return this.$get("slug");
  }

  async name() {
    const translation = await this.$ctx.loaders.featureTranslation.load(this.$props);
    return translation?.name ?? (await this.$get("slug"));
  }

  async position() {
    const index = await this.$get("index");
    return index.at(-1) ?? 0;
  }

  async featured() {
    return (await this.$get("featured")) ?? false;
  }
}

@SubgraphReference()
export class ProductFeatureResolver extends BaseFeatureResolver {
  async group() {
    const parentId = await this.$get("parentId");
    return parentId ? this.resolvers.productFeatureGroup(parentId) : null;
  }

  async values() {
    const ids = await this.$ctx.loaders.featureValueIds.load(this.$props);
    return Promise.all(ids.map((id) => this.resolvers.productFeatureValue(id)));
  }
}

@SubgraphReference()
export class ProductFeatureGroupResolver extends BaseFeatureResolver {
  async features() {
    const productId = await this.$get("productId");
    const ids = await this.$ctx.loaders.featureChildIds.load({
      productId,
      parentId: this.$props,
    });
    return Promise.all(ids.map((id) => this.resolvers.productFeature(id)));
  }
}

@SubgraphReference()
export class ProductFeatureValueResolver extends CatalogType<string, ProductFeatureValue> {
  async $preload() {
    const value = await this.$ctx.loaders.featureValue.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Product feature value not found");
    const feature = await this.$ctx.loaders.productFeature.load(value.featureId);
    const product = feature ? await this.$ctx.loaders.product.load(feature.productId) : null;
    if (!feature || !isPublishedProduct(product)) {
      throw new PreloadNotFoundError("Product feature value not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.FeatureValue);
  }

  handle() {
    return this.$get("slug");
  }

  async name() {
    const translation = await this.$ctx.loaders.featureValueTranslation.load(this.$props);
    return translation?.name ?? (await this.$get("slug"));
  }

  position() {
    return this.$get("index");
  }

  async feature() {
    return this.resolvers.productFeature(await this.$get("featureId"));
  }
}

@SubgraphReference()
export class InventoryItemResolver extends CatalogType<string, InventoryItem> {
  async $preload() {
    const value = await this.$ctx.loaders.inventoryItem.load(this.$props);
    if (!value || !(await loadPublishedVariant(this.$ctx, value.variantId))) {
      throw new PreloadNotFoundError("Inventory item not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.InventoryItem);
  }

  async variant() {
    return this.resolvers.productVariant(await this.$get("variantId"));
  }

  sku() {
    return this.$get("sku");
  }

  tracked() {
    return this.$get("trackInventory");
  }

  requiresShipping() {
    return this.$get("requiresShipping");
  }

  async inventoryPolicy() {
    return (await this.$get("continueSellingWhenOutOfStock")) ? "CONTINUE" : "DENY";
  }

  async quantityAvailable() {
    return (await inventoryState(this.$ctx, await this.$get("variantId"))).quantityAvailable;
  }

  async availableForSale() {
    return (await inventoryState(this.$ctx, await this.$get("variantId"))).availableForSale;
  }

  async currentlyNotInStock() {
    return (await inventoryState(this.$ctx, await this.$get("variantId"))).currentlyNotInStock;
  }
}
