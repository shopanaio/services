import { DimensionUnit, OptionDisplayType, WeightUnit } from "@/graphql/types";
import type {
  ApiCategory,
  ApiProduct,
  ApiProductOption,
  ApiVariant,
} from "@/graphql/types";
import {
  createMockApiCategory,
  createMockApiDescription,
  createMockApiFile,
  createMockApiInventoryItem,
  createMockApiInventoryItemCost,
  createMockApiInventoryItemDimensions,
  createMockApiInventoryItemWeight,
  createMockApiProduct,
  createMockApiProductOption,
  createMockApiProductOptionSwatch,
  createMockApiProductOptionValue,
  createMockApiTag,
  createMockApiVariant,
  createMockApiVariantMediaItem,
  createMockApiVariantPrice,
  createMockApiWarehouseStock,
} from "./api-builders";

const SIMPLE_PRODUCT_ID = "prod-simple-1";
const VARIABLE_PRODUCT_ID = "prod-phone-1";
const DRAFT_PRODUCT_ID = "prod-draft-1";
const ARCHIVED_PRODUCT_ID = "prod-archived-1";

const createMedia = (seed: string, index: number) =>
  createMockApiVariantMediaItem({
    file: createMockApiFile({
      id: `file-${seed}-${index}`,
      name: `${seed}-${index}.jpg`,
      seed: `${seed}-${index}`,
      altText: seed.replace(/-/g, " "),
    }),
    sortIndex: index,
  });

const createCategoryMedia = (seed: string, index: number) => ({
  __typename: "CategoryMediaItem" as const,
  file: createMockApiFile({
    id: `file-${seed}-${index}`,
    name: `${seed}-${index}.jpg`,
    seed: `${seed}-${index}`,
    altText: seed.replace(/-/g, " "),
  }),
  sortIndex: index,
});

const electronicsCategory = createMockApiCategory({
  id: "cat-1",
  name: "Electronics",
  handle: "electronics",
  media: [createCategoryMedia("electronics-category", 0)],
});

const smartphonesCategory = createMockApiCategory({
  id: "cat-2",
  name: "Smartphones",
  handle: "smartphones",
  parent: electronicsCategory,
  ancestors: [electronicsCategory],
  media: [createCategoryMedia("smartphones-category", 0)],
});

const iphoneCategory = createMockApiCategory({
  id: "cat-1-1-1",
  name: "iPhone",
  handle: "iphone",
  parent: smartphonesCategory,
  ancestors: [electronicsCategory, smartphonesCategory],
});

const samsungGalaxyCategory = createMockApiCategory({
  id: "cat-1-1-2",
  name: "Samsung Galaxy",
  handle: "samsung-galaxy",
  parent: smartphonesCategory,
  ancestors: [electronicsCategory, smartphonesCategory],
});

const clothingCategory = createMockApiCategory({
  id: "cat-3",
  name: "Clothing",
  handle: "clothing",
  media: [createCategoryMedia("clothing-category", 0)],
});

export const mockApiCategories: ApiCategory[] = [
  electronicsCategory,
  smartphonesCategory,
  iphoneCategory,
  samsungGalaxyCategory,
  clothingCategory,
];

const detailProductCategories = [
  electronicsCategory,
  smartphonesCategory,
  iphoneCategory,
  samsungGalaxyCategory,
];

const newArrivalTag = createMockApiTag({
  id: "tag-1",
  name: "New Arrival",
  handle: "new-arrival",
});

const bestsellerTag = createMockApiTag({
  id: "tag-2",
  name: "Best Seller",
  handle: "best-seller",
});

export const saleTag = createMockApiTag({
  id: "tag-3",
  name: "Sale",
  handle: "sale",
});

const limitedEditionTag = createMockApiTag({
  id: "tag-4",
  name: "Limited Edition",
  handle: "limited-edition",
});

const trendingTag = createMockApiTag({
  id: "tag-5",
  name: "Trending",
  handle: "trending",
});

const ecoFriendlyTag = createMockApiTag({
  id: "tag-6",
  name: "Eco-Friendly",
  handle: "eco-friendly",
});

export const mockApiTags = [
  newArrivalTag,
  bestsellerTag,
  saleTag,
  limitedEditionTag,
  trendingTag,
  ecoFriendlyTag,
];

const detailProductTags = [
  newArrivalTag,
  bestsellerTag,
  saleTag,
  limitedEditionTag,
  trendingTag,
];

const mockSimpleProductDescriptionJson = {
  time: 1718380800000,
  version: "2.29.0",
  blocks: [
    {
      id: "desc-1",
      type: "paragraph",
      data: {
        text: "Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear. Crafted from the finest organic cotton, this t-shirt offers exceptional comfort and durability.",
      },
    },
    {
      id: "desc-2",
      type: "header",
      data: {
        text: "Features",
        level: 3,
      },
    },
    {
      id: "desc-3",
      type: "list",
      data: {
        style: "unordered",
        items: [
          "100% organic cotton",
          "Pre-shrunk fabric",
          "Reinforced seams",
          "Machine washable",
        ],
      },
    },
    {
      id: "desc-4",
      type: "paragraph",
      data: {
        text: "Available in multiple colors and sizes. Order now and experience the comfort of premium cotton.",
      },
    },
  ],
};

const mockVariableProductDescriptionJson = {
  time: 1718380800000,
  version: "2.29.0",
  blocks: [
    {
      id: "phone-desc-1",
      type: "paragraph",
      data: {
        text: "The most advanced smartphone ever. Featuring cutting-edge technology and premium titanium design that sets new standards in mobile innovation.",
      },
    },
    {
      id: "phone-desc-2",
      type: "header",
      data: {
        text: "Key Features",
        level: 3,
      },
    },
    {
      id: "phone-desc-3",
      type: "list",
      data: {
        style: "unordered",
        items: [
          '6.7" Super Retina XDR display with ProMotion technology',
          "A17 Pro chip with 6-core GPU for unprecedented performance",
          "48MP main camera system with advanced computational photography",
          "All-day battery life with fast charging support",
          "Premium titanium design - lightest Pro model ever",
        ],
      },
    },
    {
      id: "phone-desc-5",
      type: "paragraph",
      data: {
        text: "Available in Natural, Blue, White, and Black titanium finishes. Choose your storage capacity and get ready for the future of mobile technology.",
      },
    },
  ],
};

const simpleProductDescription = createMockApiDescription({
  json: mockSimpleProductDescriptionJson,
  text: "Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear. Crafted from the finest organic cotton, this t-shirt offers exceptional comfort and durability. Features: 100% organic cotton, Pre-shrunk fabric, Reinforced seams, Machine washable. Available in multiple colors and sizes. Order now and experience the comfort of premium cotton.",
  html: "<p>Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear. Crafted from the finest organic cotton, this t-shirt offers exceptional comfort and durability.</p><h3>Features</h3><ul><li>100% organic cotton</li><li>Pre-shrunk fabric</li><li>Reinforced seams</li><li>Machine washable</li></ul><p>Available in multiple colors and sizes. Order now and experience the comfort of premium cotton.</p>",
});

const variableProductDescription = createMockApiDescription({
  json: mockVariableProductDescriptionJson,
  text: 'The most advanced smartphone ever. Featuring cutting-edge technology and premium titanium design that sets new standards in mobile innovation. Key Features: 6.7" Super Retina XDR display with ProMotion technology, A17 Pro chip with 6-core GPU for unprecedented performance, 48MP main camera system with advanced computational photography, All-day battery life with fast charging support, Premium titanium design - lightest Pro model ever. Available in Natural, Blue, White, and Black titanium finishes.',
  html: '<p>The most advanced smartphone ever. Featuring cutting-edge technology and premium titanium design that sets new standards in mobile innovation.</p><h3>Key Features</h3><ul><li>6.7" Super Retina XDR display with ProMotion technology</li><li>A17 Pro chip with 6-core GPU for unprecedented performance</li><li>48MP main camera system with advanced computational photography</li><li>All-day battery life with fast charging support</li><li>Premium titanium design - lightest Pro model ever</li></ul><p>Available in Natural, Blue, White, and Black titanium finishes. Choose your storage capacity and get ready for the future of mobile technology.</p>',
});

const createExcerptDescription = (id: string, text: string) =>
  createMockApiDescription({
    json: {
      time: 1718380800000,
      version: "2.29.0",
      blocks: [
        {
          id,
          type: "paragraph",
          data: { text },
        },
      ],
    },
    text,
    html: `<p>${text}</p>`,
  });

const colorOption = createMockApiProductOption({
  id: "opt-color",
  name: "Color",
  slug: "color",
  displayType: OptionDisplayType.Swatch,
  values: [
    createMockApiProductOptionValue({
      id: "feat-black",
      name: "Black",
      slug: "black",
      swatch: createMockApiProductOptionSwatch({
        id: "swatch-black",
        colorOne: "#111111",
      }),
    }),
    createMockApiProductOptionValue({
      id: "feat-white",
      name: "White",
      slug: "white",
      swatch: createMockApiProductOptionSwatch({
        id: "swatch-white",
        colorOne: "#ffffff",
      }),
    }),
    createMockApiProductOptionValue({
      id: "feat-blue",
      name: "Blue",
      slug: "blue",
      swatch: createMockApiProductOptionSwatch({
        id: "swatch-blue",
        colorOne: "#1677ff",
      }),
    }),
  ],
});

const storageOption = createMockApiProductOption({
  id: "opt-storage",
  name: "Storage",
  slug: "storage",
  values: [
    createMockApiProductOptionValue({
      id: "feat-128gb",
      name: "128 GB",
      slug: "128gb",
    }),
    createMockApiProductOptionValue({
      id: "feat-256gb",
      name: "256 GB",
      slug: "256gb",
    }),
    createMockApiProductOptionValue({
      id: "feat-512gb",
      name: "512 GB",
      slug: "512gb",
    }),
  ],
});

export const mockVariableProductOptions: ApiProductOption[] = [
  colorOption,
  storageOption,
];

const createInventoryItem = (params: {
  variantId: string;
  sku: string;
  stock: number;
  costMinor: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightUnit?: WeightUnit;
  dimensionUnit?: DimensionUnit;
}) =>
  createMockApiInventoryItem({
    id: `inventory-${params.variantId}`,
    variantId: params.variantId,
    sku: params.sku,
    totalAvailable: params.stock,
    stock: [
      createMockApiWarehouseStock({
        id: `stock-${params.variantId}`,
        quantityOnHand: params.stock,
      }),
    ],
    unitCost: createMockApiInventoryItemCost({
      amountMinor: params.costMinor,
    }),
    weight: createMockApiInventoryItemWeight({
      weightGrams: params.weightGrams,
      displayUnit: params.weightUnit,
    }),
    dimensions: createMockApiInventoryItemDimensions({
      lengthMm: params.lengthMm,
      widthMm: params.widthMm,
      heightMm: params.heightMm,
      displayUnit: params.dimensionUnit,
    }),
  });

const createSimpleVariant = (params: {
  id: string;
  title: string;
  handle: string;
  sku: string;
  amountMinor: number;
  compareAtMinor?: number | null;
  costMinor?: number;
  stock: number;
  mediaSeed: string;
  mediaCount?: number;
}): ApiVariant =>
  createMockApiVariant({
    id: params.id,
    title: params.title,
    handle: params.handle,
    isDefault: true,
    price: createMockApiVariantPrice({
      id: `price-${params.id}`,
      amountMinor: params.amountMinor,
      compareAtMinor: params.compareAtMinor ?? null,
    }),
    inventoryItem: createInventoryItem({
      variantId: params.id,
      sku: params.sku,
      stock: params.stock,
      costMinor: params.costMinor ?? Math.round(params.amountMinor * 0.6),
      weightGrams: 200,
      lengthMm: 700,
      widthMm: 500,
      heightMm: 20,
      weightUnit: WeightUnit.G,
      dimensionUnit: DimensionUnit.Cm,
    }),
    media: Array.from({ length: params.mediaCount ?? 5 }, (_, index) =>
      createMedia(params.mediaSeed, index),
    ),
  });

const createPhoneVariant = (params: {
  index: number;
  colorId: string;
  colorName: string;
  storageId: string;
  storageName: string;
  priceMinor: number;
  compareAtMinor?: number | null;
  stock: number;
}): ApiVariant => {
  const id = `var-${VARIABLE_PRODUCT_ID}-${params.index}`;

  return createMockApiVariant({
    id,
    title: `${params.colorName} / ${params.storageName}`,
    handle: `${params.colorId.replace("feat-", "")}-${params.storageId.replace("feat-", "")}`,
    isDefault: params.index === 0,
    price: createMockApiVariantPrice({
      id: `price-${id}`,
      amountMinor: params.priceMinor,
      compareAtMinor: params.compareAtMinor ?? null,
    }),
    inventoryItem: createInventoryItem({
      variantId: id,
      sku: `SKU-${VARIABLE_PRODUCT_ID.toUpperCase()}-${params.index}`,
      stock: params.stock,
      costMinor: Math.floor(params.priceMinor * 0.6),
      weightGrams: 221,
      lengthMm: 159,
      widthMm: 76,
      heightMm: 8,
      weightUnit: WeightUnit.G,
      dimensionUnit: DimensionUnit.Mm,
    }),
    selectedOptions: [
      {
        __typename: "SelectedOption",
        optionId: "opt-color",
        optionValueId: params.colorId,
      },
      {
        __typename: "SelectedOption",
        optionId: "opt-storage",
        optionValueId: params.storageId,
      },
    ],
    media: [
      createMedia(`variant-${VARIABLE_PRODUCT_ID}`, params.index),
      ...Array.from({ length: 4 }, (_, index) =>
        createMedia(`variant-${VARIABLE_PRODUCT_ID}`, params.index * 10 + index),
      ),
    ],
  });
};

export const mockSimpleProduct: ApiProduct = createMockApiProduct({
  id: SIMPLE_PRODUCT_ID,
  title: "Classic Cotton T-Shirt",
  handle: "classic-cotton-t-shirt",
  isPublished: true,
  description: simpleProductDescription,
  excerpt: createExcerptDescription(
    "simple-excerpt-1",
    "Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear.",
  ),
  seo: {
    __typename: "ProductSeo",
    seoTitle: "Classic Cotton T-Shirt | Premium Quality",
    seoDescription:
      "Shop our premium quality classic cotton t-shirt. 100% organic cotton, modern fit, perfect for everyday wear.",
    ogTitle: "Classic Cotton T-Shirt",
    ogDescription: "Premium organic cotton t-shirt.",
    ogImage: createMedia("tshirt-og", 0).file,
  },
  variants: [
    createSimpleVariant({
      id: "var-simple-1",
      title: "Default",
      handle: "classic-cotton-t-shirt-default",
      sku: "TSHIRT-001",
      amountMinor: 299900,
      compareAtMinor: 399900,
      costMinor: 150000,
      stock: 84,
      mediaSeed: "tshirt",
    }),
  ],
  options: [],
  categories: detailProductCategories,
  tags: detailProductTags,
  createdAt: "2024-03-15T00:00:00.000Z",
  updatedAt: "2024-12-20T00:00:00.000Z",
  publishedAt: "2024-03-15T00:00:00.000Z",
  revision: 3,
});

export const mockVariableProduct: ApiProduct = createMockApiProduct({
  id: VARIABLE_PRODUCT_ID,
  title: "Smartphone Pro Max 15",
  handle: "smartphone-pro-max-15",
  isPublished: true,
  description: variableProductDescription,
  excerpt: createExcerptDescription(
    "phone-excerpt-1",
    "The most advanced smartphone ever with cutting-edge A17 Pro chip, 48MP camera system, and premium titanium design.",
  ),
  seo: {
    __typename: "ProductSeo",
    seoTitle: "Smartphone Pro Max 15 | Buy Now",
    seoDescription:
      "Shop Smartphone Pro Max 15. Available in multiple colors and storage options.",
    ogTitle: "Smartphone Pro Max 15",
    ogDescription: "A premium smartphone with pro performance.",
    ogImage: createMedia("phone-og", 0).file,
  },
  variants: [
    createPhoneVariant({
      index: 0,
      colorId: "feat-black",
      colorName: "Black",
      storageId: "feat-128gb",
      storageName: "128 GB",
      priceMinor: 8999900,
      compareAtMinor: 9999900,
      stock: 32,
    }),
    createPhoneVariant({
      index: 1,
      colorId: "feat-black",
      colorName: "Black",
      storageId: "feat-256gb",
      storageName: "256 GB",
      priceMinor: 9999900,
      compareAtMinor: 10999900,
      stock: 18,
    }),
    createPhoneVariant({
      index: 2,
      colorId: "feat-black",
      colorName: "Black",
      storageId: "feat-512gb",
      storageName: "512 GB",
      priceMinor: 11999900,
      stock: 6,
    }),
    createPhoneVariant({
      index: 3,
      colorId: "feat-white",
      colorName: "White",
      storageId: "feat-128gb",
      storageName: "128 GB",
      priceMinor: 8999900,
      compareAtMinor: 9999900,
      stock: 24,
    }),
    createPhoneVariant({
      index: 4,
      colorId: "feat-white",
      colorName: "White",
      storageId: "feat-256gb",
      storageName: "256 GB",
      priceMinor: 9999900,
      compareAtMinor: 10999900,
      stock: 12,
    }),
    createPhoneVariant({
      index: 5,
      colorId: "feat-white",
      colorName: "White",
      storageId: "feat-512gb",
      storageName: "512 GB",
      priceMinor: 11999900,
      stock: 0,
    }),
    createPhoneVariant({
      index: 6,
      colorId: "feat-blue",
      colorName: "Blue",
      storageId: "feat-128gb",
      storageName: "128 GB",
      priceMinor: 9199900,
      compareAtMinor: 10199900,
      stock: 16,
    }),
    createPhoneVariant({
      index: 7,
      colorId: "feat-blue",
      colorName: "Blue",
      storageId: "feat-256gb",
      storageName: "256 GB",
      priceMinor: 10199900,
      compareAtMinor: 11199900,
      stock: 9,
    }),
    createPhoneVariant({
      index: 8,
      colorId: "feat-blue",
      colorName: "Blue",
      storageId: "feat-512gb",
      storageName: "512 GB",
      priceMinor: 12199900,
      stock: 3,
    }),
  ],
  options: mockVariableProductOptions,
  categories: detailProductCategories,
  tags: detailProductTags,
  createdAt: "2024-09-12T00:00:00.000Z",
  updatedAt: "2024-12-28T00:00:00.000Z",
  publishedAt: "2024-09-12T00:00:00.000Z",
  revision: 5,
});

export const mockDraftProduct: ApiProduct = createMockApiProduct({
  id: DRAFT_PRODUCT_ID,
  title: "New Product Draft",
  handle: "new-product-draft",
  isPublished: false,
  description: null,
  excerpt: null,
  seo: null,
  variants: [
    createSimpleVariant({
      id: "var-draft-1",
      title: "Default",
      handle: "new-product-draft-default",
      sku: "TSHIRT-001",
      amountMinor: 299900,
      compareAtMinor: 399900,
      costMinor: 150000,
      stock: 0,
      mediaSeed: "draft-product",
      mediaCount: 0,
    }),
  ],
  options: [],
  categories: detailProductCategories,
  tags: detailProductTags,
  createdAt: "2024-03-15T00:00:00.000Z",
  updatedAt: "2024-12-20T00:00:00.000Z",
  publishedAt: null,
});

export const mockArchivedProduct: ApiProduct = createMockApiProduct({
  ...mockSimpleProduct,
  id: ARCHIVED_PRODUCT_ID,
  title: "Discontinued Product",
  handle: "discontinued-product",
  isPublished: false,
  publishedAt: null,
  deletedAt: "2024-11-01T12:00:00.000Z",
  variants: [
    createSimpleVariant({
      id: "var-archived-1",
      title: "Default",
      handle: "discontinued-product-default",
      sku: "TSHIRT-001",
      amountMinor: 299900,
      compareAtMinor: 399900,
      costMinor: 150000,
      stock: 0,
      mediaSeed: "tshirt",
    }),
  ],
  options: [],
});

export const mockProductDetailsProducts: ApiProduct[] = [
  mockVariableProduct,
  mockSimpleProduct,
  mockDraftProduct,
  mockArchivedProduct,
];

export const findMockProductById = (id?: string | null): ApiProduct =>
  mockProductDetailsProducts.find((product) => product.id === id) ??
  mockVariableProduct;

export const mockProduct = mockVariableProduct;
