/**
 * Mock data for Inventory list page (Shopify-style)
 */

export interface IInventoryListItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
  image: string;
}

const products = [
  { name: "iPhone 15 Pro Max", variants: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "Samsung Galaxy S24 Ultra", variants: ["256GB", "512GB", "1TB"] },
  { name: "MacBook Pro 16", variants: ["M3 Pro", "M3 Max"] },
  { name: "Sony WH-1000XM5", variants: ["Black", "Silver", "Blue"] },
  { name: "iPad Air M2", variants: ["64GB", "256GB"] },
  { name: "AirPods Pro 2", variants: null },
  { name: "Nintendo Switch OLED", variants: ["White", "Neon"] },
  { name: "Apple Watch Ultra 2", variants: ["49mm S/M", "49mm M/L"] },
  { name: "Sony PlayStation 5", variants: ["Digital", "Disc"] },
  { name: "Dyson V15 Detect", variants: null },
];

function generateSku(productIndex: number, variantIndex: number | null): string {
  const prefix = products[productIndex].name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return variantIndex !== null
    ? `${prefix}-${String(productIndex + 1).padStart(3, "0")}-${variantIndex + 1}`
    : `${prefix}-${String(productIndex + 1).padStart(3, "0")}`;
}

let itemId = 0;
export const mockInventoryList: IInventoryListItem[] = products.flatMap(
  (product, productIndex): IInventoryListItem[] => {
    if (product.variants === null) {
      const onHand = Math.floor(Math.random() * 200);
      const unavailable = Math.floor(Math.random() * Math.min(10, onHand));
      const reserved = Math.floor(Math.random() * Math.min(20, onHand - unavailable));
      const available = onHand - unavailable - reserved;

      return [{
        id: String(++itemId),
        productName: product.name,
        variantName: null,
        sku: generateSku(productIndex, null),
        onHand,
        unavailable,
        reserved,
        available,
        image: `https://picsum.photos/seed/${productIndex + 1}/40/40`,
      }];
    }

    return product.variants.map((variant, variantIndex) => {
      const onHand = Math.floor(Math.random() * 200);
      const unavailable = Math.floor(Math.random() * Math.min(10, onHand));
      const reserved = Math.floor(Math.random() * Math.min(20, onHand - unavailable));
      const available = onHand - unavailable - reserved;

      return {
        id: String(++itemId),
        productName: product.name,
        variantName: variant,
        sku: generateSku(productIndex, variantIndex),
        onHand,
        unavailable,
        reserved,
        available,
        image: `https://picsum.photos/seed/${productIndex + 1}/40/40`,
      };
    });
  }
);
