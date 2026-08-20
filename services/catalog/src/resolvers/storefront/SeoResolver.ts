import { CatalogType as BaseCatalogType } from "./CatalogType.js";
import { mediaReference } from "./MediaConnectionResolver.js";

export interface SeoShape {
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
}

export class SeoResolver extends BaseCatalogType<SeoShape, SeoShape> {
  $preload() {
    return Promise.resolve(this.$props);
  }

  title() {
    return this.$props.seoTitle;
  }

  description() {
    return this.$props.seoDescription;
  }

  openGraph() {
    return new OpenGraphMetadataResolver(this.$props, this.$ctx);
  }
}

class OpenGraphMetadataResolver extends BaseCatalogType<SeoShape, SeoShape> {
  $preload() {
    return Promise.resolve(this.$props);
  }

  title() {
    return this.$props.ogTitle;
  }

  description() {
    return this.$props.ogDescription;
  }

  image() {
    return this.$props.ogImageId ? mediaReference(this.$props.ogImageId) : null;
  }
}

export function emptySeo(): SeoShape {
  return {
    seoTitle: null,
    seoDescription: null,
    ogTitle: null,
    ogDescription: null,
    ogImageId: null,
  };
}
