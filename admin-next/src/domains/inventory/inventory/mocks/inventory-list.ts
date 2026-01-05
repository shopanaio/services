/**
 * Mock data for Inventory list page
 */

export interface IInventoryListItem {
  id: string;
  sku: string;
  productName: string;
  location: string;
  quantity: number;
  reserved: number;
  available: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

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
];

const locations = [
  "Warehouse A",
  "Warehouse B",
  "Warehouse C",
  "Store Front",
  "Distribution Center",
];

const statuses: IInventoryListItem["status"][] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
];

function generateSKU(index: number): string {
  const prefix = ["SKU", "INV", "PRD"][index % 3];
  return `${prefix}-${String(index + 1000).padStart(6, "0")}`;
}

function getStatus(quantity: number): IInventoryListItem["status"] {
  if (quantity === 0) return "out_of_stock";
  if (quantity < 10) return "low_stock";
  return "in_stock";
}

function generateDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

export const mockInventoryList: IInventoryListItem[] = Array.from(
  { length: 50 },
  (_, i) => {
    const quantity = i % 7 === 0 ? 0 : Math.floor(Math.random() * 150);
    const reserved = Math.floor(Math.random() * Math.min(quantity, 20));
    return {
      id: String(i + 1),
      sku: generateSKU(i),
      productName: productNames[i % productNames.length],
      location: locations[i % locations.length],
      quantity,
      reserved,
      available: quantity - reserved,
      status: getStatus(quantity),
      lastUpdated: generateDate(Math.floor(Math.random() * 30)),
    };
  }
);
