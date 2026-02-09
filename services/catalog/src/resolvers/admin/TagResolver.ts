import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Tag } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * Tag resolver - resolves Tag domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class TagResolver extends CatalogType<string, Tag> {
  async $preload() {
    const tag = await this.$ctx.loaders.tag.load(this.$props);
    if (!tag) {
      throw new Error(`Tag with ID ${this.$props} not found`);
    }
    return tag;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Tag);
  }

  async handle() {
    return this.$get("handle");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  /**
   * Returns the translated name for this tag
   * Falls back to handle if no translation exists
   */
  async name(): Promise<string> {
    const translation = await this.$ctx.loaders.tagTranslation.load(
      this.$props
    );
    if (translation?.name) {
      return translation.name;
    }
    // Fallback to handle
    return (await this.$get("handle")) ?? "";
  }

  /**
   * Returns the count of products with this tag
   */
  async productsCount(): Promise<number> {
    return this.$ctx.loaders.tagProductsCount.load(this.$props);
  }

  // TODO: Implement products() with keyset pagination
}
