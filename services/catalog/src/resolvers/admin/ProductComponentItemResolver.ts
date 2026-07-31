import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { ComponentItem } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

export class ProductComponentItemResolver extends CatalogType<
  string,
  ComponentItem
> {
  async $preload() {
    const item = await this.$ctx.loaders.componentItem.load(this.$props);
    if (!item) {
      throw new PreloadNotFoundError(
        `Product component item with ID ${this.$props} not found`,
      );
    }
    return item;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ProductComponentItem);
  }

  async group() {
    return this.resolvers.productComponentGroup(await this.$get("groupId"));
  }

  async itemType() {
    return this.$get("itemType");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }

  async refProduct() {
    const id = await this.$get("refProductId");
    if (!id) return null;
    const product = await this.$ctx.loaders.product.load(id);
    return product ? this.resolvers.product(id) : null;
  }

  async refVariant() {
    const id = await this.$get("refVariantId");
    if (!id) return null;
    const variant = await this.$ctx.loaders.variant.load(id);
    return variant ? this.resolvers.variant(id) : null;
  }

  async featuredImage() {
    const id = await this.$get("featuredImageId");
    return id
      ? {
          __typename: "File" as const,
          id: this.encodeId(id, GlobalIdEntity.File),
        }
      : null;
  }

  async minQty() {
    return this.$get("minQty");
  }

  async maxQty() {
    return this.$get("maxQty");
  }

  async defaultQty() {
    return this.$get("defaultQty");
  }

  async priceRule() {
    const id = await this.$get("priceRuleId");
    return id
      ? this.resolvers.productComponentPriceRule(id)
      : null;
  }

  async pricingTemplate() {
    const id = await this.$get("pricingTemplateId");
    return id
      ? this.resolvers.productComponentPricingTemplate(id)
      : null;
  }

  async optionSelections() {
    const ids =
      await this.$ctx.loaders.componentOptionSelectionIdsByItemId.load(
        this.$props,
      );
    return Promise.all(
      ids.map((id: string) =>
        this.resolvers.productComponentItemOptionSelection(id)
      ),
    );
  }

  async title() {
    const translation =
      await this.$ctx.loaders.componentItemTranslation.load(this.$props);
    return translation?.name ?? null;
  }

  async visible() {
    return this.$get("visible");
  }

  async selected() {
    return this.$get("selected");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
