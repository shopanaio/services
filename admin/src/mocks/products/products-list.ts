import type { ApiProduct, ApiProductConnection } from "@/graphql/types";
import {
  createMockApiCategory,
  createMockApiFile,
  createMockApiInventoryItem,
  createMockApiInventoryItemCost,
  createMockApiInventoryItemDimensions,
  createMockApiInventoryItemWeight,
  createMockApiProduct,
  createMockApiProductConnection,
  createMockApiProductFeature,
  createMockApiProductFeatureValue,
  createMockApiVariant,
  createMockApiVariantMediaItem,
  createMockApiVariantPrice,
  createMockApiWarehouseStock,
  createMockPageInfo,
} from "./api-builders";

const productNames = [
  "iPhone 15 Pro Max",
  "Samsung Galaxy S24 Ultra",
  "MacBook Pro 16",
  "Sony WH-1000XM5",
  "iPad Air M2",
  "Dell XPS 15",
  "AirPods Pro 2",
  "Google Pixel 8 Pro",
  "Nintendo Switch OLED",
  "Logitech MX Master 3S",
  "Sony PlayStation 5",
  "Xbox Series X",
  "LG OLED TV 55",
  "Bose QuietComfort 45",
  "Canon EOS R5",
  "DJI Mavic 3 Pro",
  "Apple Watch Ultra 2",
  "Samsung Galaxy Watch 6",
  "Razer BlackWidow V4",
  "SteelSeries Arctis Nova",
  "ASUS ROG Strix",
  "MSI Titan GT77",
  "Lenovo ThinkPad X1",
  "HP Spectre x360",
  "Acer Predator Helios",
  "Corsair K100 RGB",
  "Elgato Stream Deck",
  "Blue Yeti X",
  "Shure SM7B",
  "Rode NT1",
  "Wacom Cintiq Pro",
  "Huion Kamvas 24",
  "BenQ PD3220U",
  "LG UltraGear 27",
  "Samsung Odyssey G9",
  "Secretlab Titan",
  "Herman Miller Aeron",
  "Dyson V15 Detect",
  "iRobot Roomba j7",
  "Sonos Arc",
  "KEF LS50 Meta",
  "Sennheiser HD 800S",
  "Focal Clear MG",
  "Anker PowerCore",
  "Belkin MagSafe",
  "CalDigit TS4",
  "OWC Thunderbay",
  "Synology DS923+",
  "QNAP TS-464",
  "Ubiquiti Dream Machine",
];

export const categories = ["Phone", "Laptop", "Audio", "Gaming", "Accessory"];
export const brands = [
  "Apple",
  "Samsung",
  "Sony",
  "Microsoft",
  "Logitech",
  "Dell",
  "Google",
  "Nintendo",
  "Bose",
  "Canon",
];
export const statuses = ["published", "draft"] as const;

const toHandle = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const listCategories = categories.map((name, index) =>
  createMockApiCategory({
    id: `list-category-${index + 1}`,
    name,
    handle: toHandle(name),
  }),
);

const createBrandFeature = (brand: string, index: number) =>
  createMockApiProductFeature({
    id: `list-brand-feature-${index + 1}`,
    name: "Brand",
    slug: "brand",
    index: [0],
    values: [
      createMockApiProductFeatureValue({
        id: `list-brand-${index + 1}`,
        name: brand,
        slug: toHandle(brand),
      }),
    ],
  });

const createListProduct = (_: unknown, index: number): ApiProduct => {
  const id = String(index + 1);
  const title = productNames[index % productNames.length];
  const status = statuses[index % 5 === 0 ? 1 : 0];
  const inventory = Math.floor(Math.random() * 150);
  const category = listCategories[index % listCategories.length];
  const brand = brands[index % brands.length];
  const variantId = `variant-list-${id}`;

  const variant = createMockApiVariant({
    id: variantId,
    title: "Default",
    handle: `${toHandle(title)}-default`,
    isDefault: true,
    price: createMockApiVariantPrice({
      id: `price-${variantId}`,
      amountMinor: 0,
    }),
    inventoryItem: createMockApiInventoryItem({
      id: `inventory-${variantId}`,
      variantId,
      sku: null,
      totalAvailable: inventory,
      stock: [
        createMockApiWarehouseStock({
          id: `stock-${variantId}`,
          quantityOnHand: inventory,
        }),
      ],
      unitCost: createMockApiInventoryItemCost({
        amountMinor: 0,
      }),
      weight: createMockApiInventoryItemWeight({ weightGrams: 0 }),
      dimensions: createMockApiInventoryItemDimensions({
        lengthMm: 0,
        widthMm: 0,
        heightMm: 0,
      }),
    }),
    media: [
      createMockApiVariantMediaItem({
        file: createMockApiFile({
          id: `file-list-${id}`,
          name: `${id}.jpg`,
          url: `https://picsum.photos/seed/${id}/40/40`,
          width: 40,
          height: 40,
          altText: title,
        }),
      }),
    ],
  });

  return createMockApiProduct({
    id,
    title,
    handle: toHandle(title),
    isPublished: status === "published",
    publishedAt: status === "published" ? "2024-10-01T12:00:00.000Z" : null,
    variants: [variant],
    options: [],
    categories: [category],
    tags: [],
    features: [createBrandFeature(brand, index)],
    createdAt: "2024-09-01T12:00:00.000Z",
    updatedAt: "2024-12-01T12:00:00.000Z",
  });
};

export const mockProductsList: ApiProduct[] = Array.from(
  { length: 50 },
  createListProduct,
);

export const mockProductsConnection: ApiProductConnection =
  createMockApiProductConnection(
    mockProductsList,
    createMockPageInfo({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "product-cursor-0",
      endCursor: `product-cursor-${mockProductsList.length - 1}`,
    }),
    mockProductsList.length,
  );
