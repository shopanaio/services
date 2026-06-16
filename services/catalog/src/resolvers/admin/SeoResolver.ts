import { CatalogType } from "./CatalogType.js";

interface SeoShape {
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
}

export class SeoResolver extends CatalogType<SeoShape, SeoShape> {
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

  ogImage() {
    if (!this.$props.ogImageId) return null;
    return { __typename: "File" as const, id: this.$props.ogImageId };
  }
}
