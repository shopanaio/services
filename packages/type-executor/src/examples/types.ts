/**
 * Example types demonstrating the type-executor pattern.
 * Based on the MODEL_EXECUTOR documentation.
 */

import { getContext, BaseType, type BaseContext } from "../index.js";

// ============================================
// Domain Models (raw data from database)
// ============================================

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  translations: Record<string, { title?: string; description?: string }>;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
}

export interface Image {
  id: string;
  variantId: string;
  url: string;
  alt: string;
  size: "thumb" | "full";
  isPrimary: boolean;
  translations: Record<string, { alt?: string }>;
}

export interface Price {
  id: string;
  variantId: string;
  amount: number;
  currency: string;
}

export interface Attribute {
  id: string;
  productId: string;
  name: string;
  value: string;
  translations: Record<string, { name?: string; value?: string }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

// ============================================
// DataLoader Types
// ============================================

export interface DataLoader<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<V[]>;
}

export interface ProductLoaders {
  variants: DataLoader<string, Variant[]>;
  attributes: DataLoader<string, Attribute[]>;
  images: DataLoader<string, Image[]>;
  prices: DataLoader<string, Price[]>;
  categories: DataLoader<string, Category[]>;
  related: DataLoader<string, Product[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;
}

// ============================================
// Context
// ============================================

export interface ProductContext extends BaseContext {
  loaders: ProductLoaders;
  locale: string;
  currency: string;
  imageSize: "thumb" | "full";
}

// ============================================
// Type Definitions (Resolvers)
// ============================================

/**
 * Image type with localized alt text
 */
export class ImageType {
  constructor(public value: Image) {}

  id() {
    return this.value.id;
  }

  url() {
    return this.value.url;
  }

  alt() {
    const { locale } = getContext<ProductContext>();
    return this.value.translations[locale]?.alt ?? this.value.alt;
  }

  isPrimary() {
    return this.value.isPrimary;
  }
}

/**
 * Price type with formatted currency
 */
export class PriceType {
  constructor(public value: Price) {}

  amount() {
    return this.value.amount;
  }

  currency() {
    return this.value.currency;
  }

  formatted() {
    const { locale } = getContext<ProductContext>();
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.value.currency,
    }).format(this.value.amount);
  }
}

/**
 * Attribute type with localized name and value
 */
export class AttributeType {
  constructor(public value: Attribute) {}

  name() {
    const { locale } = getContext<ProductContext>();
    return this.value.translations[locale]?.name ?? this.value.name;
  }

  attrValue() {
    const { locale } = getContext<ProductContext>();
    return this.value.translations[locale]?.value ?? this.value.value;
  }
}

/**
 * Category type
 */
export class CategoryType {
  constructor(public value: Category) {}

  id() {
    return this.value.id;
  }

  name() {
    return this.value.name;
  }

  slug() {
    return this.value.slug;
  }
}

/**
 * Variant type with images and prices
 */
export class VariantType {
  static fields = {
    images: () => ImageType,
    prices: () => PriceType,
  };

  constructor(public value: Variant) {}

  id() {
    return this.value.id;
  }

  sku() {
    return this.value.sku;
  }

  async images() {
    const { loaders, imageSize } = getContext<ProductContext>();
    const images = await loaders.images.load(this.value.id);
    return images.filter((i) => i.size === imageSize);
  }

  async prices() {
    const { loaders, currency } = getContext<ProductContext>();
    const prices = await loaders.prices.load(this.value.id);
    return prices.filter((p) => p.currency === currency);
  }
}

/**
 * Full product type with all relations
 */
export class ProductType {
  static fields = {
    variants: () => VariantType,
    attributes: () => AttributeType,
  };

  constructor(public value: Product) {}

  id() {
    return this.value.id;
  }

  title() {
    const { locale } = getContext<ProductContext>();
    return this.value.translations[locale]?.title ?? this.value.title;
  }

  slug() {
    return this.value.slug;
  }

  description() {
    const { locale } = getContext<ProductContext>();
    return this.value.translations[locale]?.description ?? this.value.description;
  }

  async variants() {
    const { loaders } = getContext<ProductContext>();
    return loaders.variants.load(this.value.id);
  }

  async attributes() {
    const { loaders } = getContext<ProductContext>();
    return loaders.attributes.load(this.value.id);
  }
}

/**
 * Full product type with categories and related products.
 * Uses BaseType so that complex resolvers can rely on shared helpers like ctx() and data().
 */
export class ProductFullType extends BaseType<Product> {
  static fields = {
    variants: () => VariantFullType,
    attributes: () => AttributeType,
    categories: () => CategoryType,
    related: () => ProductCardType,
  };

  async id() {
    const data = await this.data;
    return data.id;
  }

  async title() {
    const { locale } = this.ctx<ProductContext>();
    const data = await this.data;
    return data.translations[locale]?.title ?? data.title;
  }

  async description() {
    const { locale } = this.ctx<ProductContext>();
    const data = await this.data;
    return data.translations[locale]?.description ?? data.description;
  }

  async variants() {
    const data = await this.data;
    return this.ctx<ProductContext>().loaders.variants.load(data.id);
  }

  async attributes() {
    const data = await this.data;
    return this.ctx<ProductContext>().loaders.attributes.load(data.id);
  }

  async categories() {
    const data = await this.data;
    return this.ctx<ProductContext>().loaders.categories.load(data.id);
  }

  async related() {
    const data = await this.data;
    return this.ctx<ProductContext>().loaders.related.load(data.id);
  }
}

/**
 * Variant with full details, using BaseType for convenience.
 */
export class VariantFullType extends BaseType<Variant> {
  static fields = {
    images: () => ImageType,
    prices: () => PriceType,
  };

  async id() {
    const data = await this.data;
    return data.id;
  }

  async sku() {
    const data = await this.data;
    return data.sku;
  }

  async images() {
    const { loaders } = this.ctx<ProductContext>();
    const data = await this.data;
    return loaders.images.load(data.id);
  }

  async prices() {
    const { loaders } = this.ctx<ProductContext>();
    const data = await this.data;
    return loaders.prices.load(data.id);
  }
}

/**
 * Minimal product for cards/lists, with helpers from BaseType.
 */
export class ProductCardType extends BaseType<Product> {
  static fields = {
    primaryImage: () => ImageType,
  };

  async id() {
    const data = await this.data;
    return data.id;
  }

  async title() {
    const { locale } = this.ctx<ProductContext>();
    const data = await this.data;
    return data.translations[locale]?.title ?? data.title;
  }

  async slug() {
    const data = await this.data;
    return data.slug;
  }

  async primaryImage() {
    const { loaders } = this.ctx<ProductContext>();
    const data = await this.data;
    const variants = await loaders.variants.load(data.id);
    if (!variants[0]) return null;
    const images = await loaders.images.load(variants[0].id);
    return images.find((i) => i.isPrimary) || images[0] || null;
  }

  async minPrice() {
    const { loaders } = this.ctx<ProductContext>();
    const data = await this.data;
    const variants = await loaders.variants.load(data.id);
    if (variants.length === 0) return null;
    const prices = await Promise.all(variants.map((v) => loaders.prices.load(v.id)));
    const allPrices = prices.flat();
    if (allPrices.length === 0) return null;
    return Math.min(...allPrices.map((p) => p.amount));
  }
}
