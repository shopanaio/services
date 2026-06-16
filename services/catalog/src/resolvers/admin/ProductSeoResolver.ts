import type { ProductSeo as ProductSeoModel } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * File reference for federation.
 * Returns { __typename: "File", id: string } for the federation gateway to resolve.
 */
interface FileReference {
  __typename: "File";
  id: string;
}

/**
 * ProductSeo resolver - resolves ProductSeo domain interface.
 * Handles SEO and Open Graph metadata for products.
 */
export class ProductSeoResolver extends CatalogType<ProductSeoModel, ProductSeoModel> {
  async $preload() {
    return this.$props;
  }

  seoTitle() {
    return this.$props.seoTitle ?? null;
  }

  seoDescription() {
    return this.$props.seoDescription ?? null;
  }

  ogTitle() {
    return this.$props.ogTitle ?? null;
  }

  ogDescription() {
    return this.$props.ogDescription ?? null;
  }

  /**
   * Returns File reference for federation resolution.
   * The federation gateway will resolve this to the actual File entity.
   */
  ogImage(): FileReference | null {
    if (!this.$props.ogImageId) return null;
    return { __typename: "File", id: this.$props.ogImageId };
  }
}
