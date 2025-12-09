/**
 * Comprehensive tests for example types.
 * Tests the full Product → Variant → Image/Price resolution chain.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { executor, enterContext, runWithContext } from "../index.js";
import {
  ProductType,
  ProductFullType,
  ProductCardType,
  VariantType,
  ImageType,
  PriceType,
  AttributeType,
  type Product,
  type Variant,
  type Image,
  type Price,
  type Attribute,
  type Category,
  type ProductContext,
  type ProductLoaders,
} from "./types.js";

// ============================================
// Mock Data
// ============================================

const mockProducts: Record<string, Product> = {
  p1: {
    id: "p1",
    title: "iPhone 15",
    slug: "iphone-15",
    description: "The latest iPhone",
    translations: {
      ru: { title: "Айфон 15", description: "Новейший Айфон" },
      uk: { title: "Айфон 15", description: "Найновіший Айфон" },
    },
  },
  p2: {
    id: "p2",
    title: "MacBook Pro",
    slug: "macbook-pro",
    description: "Professional laptop",
    translations: {
      ru: { title: "Макбук Про", description: "Профессиональный ноутбук" },
    },
  },
};

const mockVariants: Record<string, Variant[]> = {
  p1: [
    { id: "v1", productId: "p1", sku: "IP15-BLK-128" },
    { id: "v2", productId: "p1", sku: "IP15-WHT-256" },
  ],
  p2: [{ id: "v3", productId: "p2", sku: "MBP-14-M3" }],
};

const mockImages: Record<string, Image[]> = {
  v1: [
    {
      id: "i1",
      variantId: "v1",
      url: "https://example.com/ip15-blk-thumb.jpg",
      alt: "iPhone 15 Black",
      size: "thumb",
      isPrimary: true,
      translations: { ru: { alt: "Айфон 15 Черный" } },
    },
    {
      id: "i2",
      variantId: "v1",
      url: "https://example.com/ip15-blk-full.jpg",
      alt: "iPhone 15 Black Full",
      size: "full",
      isPrimary: true,
      translations: { ru: { alt: "Айфон 15 Черный Полный" } },
    },
  ],
  v2: [
    {
      id: "i3",
      variantId: "v2",
      url: "https://example.com/ip15-wht-full.jpg",
      alt: "iPhone 15 White",
      size: "full",
      isPrimary: true,
      translations: {},
    },
  ],
  v3: [
    {
      id: "i4",
      variantId: "v3",
      url: "https://example.com/mbp-full.jpg",
      alt: "MacBook Pro",
      size: "full",
      isPrimary: true,
      translations: {},
    },
  ],
};

const mockPrices: Record<string, Price[]> = {
  v1: [
    { id: "pr1", variantId: "v1", amount: 999, currency: "USD" },
    { id: "pr2", variantId: "v1", amount: 899, currency: "EUR" },
  ],
  v2: [
    { id: "pr3", variantId: "v2", amount: 1099, currency: "USD" },
    { id: "pr4", variantId: "v2", amount: 999, currency: "EUR" },
  ],
  v3: [{ id: "pr5", variantId: "v3", amount: 1999, currency: "USD" }],
};

const mockAttributes: Record<string, Attribute[]> = {
  p1: [
    {
      id: "a1",
      productId: "p1",
      name: "Color",
      value: "Black",
      translations: { ru: { name: "Цвет", value: "Черный" } },
    },
    {
      id: "a2",
      productId: "p1",
      name: "Storage",
      value: "128GB",
      translations: { ru: { name: "Память", value: "128ГБ" } },
    },
  ],
  p2: [],
};

const mockCategories: Record<string, Category[]> = {
  p1: [
    { id: "c1", name: "Phones", slug: "phones" },
    { id: "c2", name: "Apple", slug: "apple" },
  ],
  p2: [{ id: "c3", name: "Laptops", slug: "laptops" }],
};

const mockRelated: Record<string, Product[]> = {
  p1: [mockProducts.p2],
  p2: [mockProducts.p1],
};

// ============================================
// Mock DataLoaders
// ============================================

function createMockLoaders(): ProductLoaders {
  return {
    variants: {
      load: vi.fn(async (id: string) => mockVariants[id] || []),
      loadMany: vi.fn(async (ids: string[]) => ids.map((id) => mockVariants[id] || [])),
    },
    images: {
      load: vi.fn(async (id: string) => mockImages[id] || []),
      loadMany: vi.fn(async (ids: string[]) => ids.map((id) => mockImages[id] || [])),
    },
    prices: {
      load: vi.fn(async (id: string) => mockPrices[id] || []),
      loadMany: vi.fn(async (ids: string[]) => ids.map((id) => mockPrices[id] || [])),
    },
    attributes: {
      load: vi.fn(async (id: string) => mockAttributes[id] || []),
      loadMany: vi.fn(async (ids: string[]) => ids.map((id) => mockAttributes[id] || [])),
    },
    categories: {
      load: vi.fn(async (id: string) => mockCategories[id] || []),
      loadMany: vi.fn(async (ids: string[]) => ids.map((id) => mockCategories[id] || [])),
    },
    related: {
      load: vi.fn(async (id: string) => mockRelated[id] || []),
      loadMany: vi.fn(async (ids: string[]) => ids.map((id) => mockRelated[id] || [])),
    },
  };
}

function createContext(overrides: Partial<ProductContext> = {}): ProductContext {
  return {
    loaders: createMockLoaders(),
    locale: "en",
    currency: "USD",
    imageSize: "full",
    ...overrides,
  };
}

// ============================================
// Field Selection Helpers (like GraphQL selections)
// ============================================

const imageFields = {
  id: {},
  url: {},
  alt: {},
  isPrimary: {},
};

const priceFields = {
  amount: {},
  currency: {},
  formatted: {},
};

const variantFields = {
  id: {},
  sku: {},
  images: { children: imageFields },
  prices: { children: priceFields },
};

const attributeFields = {
  name: {},
  attrValue: {},
};

const productFields = {
  id: {},
  title: {},
  slug: {},
  description: {},
  variants: { children: variantFields },
  attributes: { children: attributeFields },
};

const categoryFields = {
  id: {},
  name: {},
  slug: {},
};

const productCardFields = {
  id: {},
  title: {},
  slug: {},
  primaryImage: { children: imageFields },
  minPrice: {},
};

const productFullFields = {
  id: {},
  title: {},
  description: {},
  variants: { children: variantFields },
  attributes: { children: attributeFields },
  categories: { children: categoryFields },
  related: { children: productCardFields },
};

// ============================================
// Tests
// ============================================

describe("ProductType - Full Product Resolution", () => {
  let context: ProductContext;

  beforeEach(() => {
    context = createContext();
    enterContext(context);
  });

  it("resolves product with all nested types", async () => {
    const result = await executor.resolve(ProductType, mockProducts.p1, productFields);

    expect(result).toMatchObject({
      id: "p1",
      title: "iPhone 15",
      slug: "iphone-15",
      description: "The latest iPhone",
    });

    // Check variants resolved
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toMatchObject({
      id: "v1",
      sku: "IP15-BLK-128",
    });

    // Check variant images (filtered by imageSize: full)
    expect(result.variants[0].images).toHaveLength(1);
    expect(result.variants[0].images[0]).toMatchObject({
      id: "i2",
      url: "https://example.com/ip15-blk-full.jpg",
    });

    // Check variant prices (filtered by currency: USD)
    expect(result.variants[0].prices).toHaveLength(1);
    expect(result.variants[0].prices[0]).toMatchObject({
      amount: 999,
      currency: "USD",
    });

    // Check attributes
    expect(result.attributes).toHaveLength(2);
    expect(result.attributes[0]).toMatchObject({
      name: "Color",
      attrValue: "Black",
    });
  });

  it("uses localized translations when available", async () => {
    enterContext(createContext({ locale: "ru" }));

    const result = await executor.resolve(ProductType, mockProducts.p1, productFields);

    expect(result.title).toBe("Айфон 15");
    expect(result.description).toBe("Новейший Айфон");
    expect(result.attributes[0].name).toBe("Цвет");
    expect(result.attributes[0].attrValue).toBe("Черный");
  });

  it("falls back to default when translation missing", async () => {
    enterContext(createContext({ locale: "fr" })); // French not available

    const result = await executor.resolve(ProductType, mockProducts.p1, productFields);

    expect(result.title).toBe("iPhone 15");
    expect(result.description).toBe("The latest iPhone");
  });

  it("filters images by imageSize context", async () => {
    enterContext(createContext({ imageSize: "thumb" }));

    const result = await executor.resolve(ProductType, mockProducts.p1, productFields);

    // Only thumb images should be returned
    expect(result.variants[0].images).toHaveLength(1);
    expect(result.variants[0].images[0].url).toContain("thumb");
  });

  it("filters prices by currency context", async () => {
    enterContext(createContext({ currency: "EUR" }));

    const result = await executor.resolve(ProductType, mockProducts.p1, productFields);

    expect(result.variants[0].prices).toHaveLength(1);
    expect(result.variants[0].prices[0].amount).toBe(899);
    expect(result.variants[0].prices[0].currency).toBe("EUR");
  });
});

describe("PriceType - Currency Formatting", () => {
  beforeEach(() => {
    enterContext(createContext());
  });

  it("formats price with USD currency", async () => {
    enterContext(createContext({ locale: "en-US" }));

    const result = await executor.resolve(PriceType, mockPrices.v1[0], priceFields);

    expect(result.amount).toBe(999);
    expect(result.currency).toBe("USD");
    expect(result.formatted).toMatch(/\$999\.00/);
  });

  it("formats price with EUR currency and locale", async () => {
    enterContext(createContext({ locale: "de-DE" }));

    const result = await executor.resolve(PriceType, mockPrices.v1[1], priceFields);

    expect(result.amount).toBe(899);
    expect(result.currency).toBe("EUR");
    // German format uses comma for decimal
    expect(result.formatted).toMatch(/899/);
  });
});

describe("ProductCardType - Minimal Product for Lists", () => {
  let context: ProductContext;

  beforeEach(() => {
    context = createContext();
    enterContext(context);
  });

  it("resolves minimal product data", async () => {
    const result = await executor.resolve(ProductCardType, mockProducts.p1, productCardFields);

    expect(result).toMatchObject({
      id: "p1",
      title: "iPhone 15",
      slug: "iphone-15",
    });
  });

  it("resolves primary image from first variant", async () => {
    const result = await executor.resolve(ProductCardType, mockProducts.p1, productCardFields);

    // Returns first isPrimary image from first variant (thumb is first in array)
    expect(result.primaryImage).toMatchObject({
      id: "i1",
      url: "https://example.com/ip15-blk-thumb.jpg",
    });
  });

  it("calculates minimum price across all variants and currencies", async () => {
    const result = await executor.resolve(ProductCardType, mockProducts.p1, productCardFields);

    // Minimum price across all: 899 EUR (v1) is the lowest
    expect(result.minPrice).toBe(899);
  });

  it("returns null for primaryImage when no variants", async () => {
    const productNoVariants: Product = {
      id: "p3",
      title: "Empty Product",
      slug: "empty",
      description: "",
      translations: {},
    };

    const result = await executor.resolve(ProductCardType, productNoVariants, productCardFields);

    expect(result.primaryImage).toBeNull();
    expect(result.minPrice).toBeNull();
  });
});

describe("ProductFullType - Extended Product with BaseType", () => {
  let context: ProductContext;

  beforeEach(() => {
    context = createContext();
    enterContext(context);
  });

  it("resolves full product with categories and related", async () => {
    const result = await executor.resolve(ProductFullType, mockProducts.p1, productFullFields);

    expect(result.id).toBe("p1");
    expect(result.title).toBe("iPhone 15");

    // Categories
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0]).toMatchObject({
      id: "c1",
      name: "Phones",
      slug: "phones",
    });

    // Related products (as ProductCardType)
    expect(result.related).toHaveLength(1);
    expect(result.related[0]).toMatchObject({
      id: "p2",
      title: "MacBook Pro",
    });
  });
});

describe("runWithContext - Proper Context Isolation", () => {
  it("isolates context between runs", async () => {
    const results = await Promise.all([
      runWithContext(createContext({ locale: "en" }), () =>
        executor.resolve(ProductType, mockProducts.p1, productFields)
      ),
      runWithContext(createContext({ locale: "ru" }), () =>
        executor.resolve(ProductType, mockProducts.p1, productFields)
      ),
    ]);

    expect(results[0].title).toBe("iPhone 15");
    expect(results[1].title).toBe("Айфон 15");
  });

  it("isolates currency filter between runs", async () => {
    const [usdResult, eurResult] = await Promise.all([
      runWithContext(createContext({ currency: "USD" }), () =>
        executor.resolve(ProductType, mockProducts.p1, productFields)
      ),
      runWithContext(createContext({ currency: "EUR" }), () =>
        executor.resolve(ProductType, mockProducts.p1, productFields)
      ),
    ]);

    expect(usdResult.variants[0].prices[0].currency).toBe("USD");
    expect(eurResult.variants[0].prices[0].currency).toBe("EUR");
  });
});

describe("DataLoader Batching Verification", () => {
  it("calls loaders efficiently", async () => {
    const context = createContext();
    enterContext(context);

    await executor.resolve(ProductType, mockProducts.p1, productFields);

    // Variants loader called once for product
    expect(context.loaders.variants.load).toHaveBeenCalledTimes(1);
    expect(context.loaders.variants.load).toHaveBeenCalledWith("p1");

    // Images loader called for each variant
    expect(context.loaders.images.load).toHaveBeenCalledTimes(2);
    expect(context.loaders.images.load).toHaveBeenCalledWith("v1");
    expect(context.loaders.images.load).toHaveBeenCalledWith("v2");

    // Prices loader called for each variant
    expect(context.loaders.prices.load).toHaveBeenCalledTimes(2);

    // Attributes loader called once for product
    expect(context.loaders.attributes.load).toHaveBeenCalledTimes(1);
  });
});

describe("resolveMany - Batch Resolution", () => {
  beforeEach(() => {
    enterContext(createContext());
  });

  it("resolves multiple products at once", async () => {
    const products = [mockProducts.p1, mockProducts.p2];
    const results = await executor.resolveMany(ProductType, products, productFields);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("p1");
    expect(results[1].id).toBe("p2");
  });
});
