/**
 * Mock data for Products list page
 */

export interface IProductListItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: "active" | "draft" | "archived";
  category: string;
  image: string;
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

export const categories = ["Electronics", "Computers", "Audio", "Gaming", "Accessories"];
export const statuses: IProductListItem["status"][] = ["active", "draft", "archived"];

export const mockProductsList: IProductListItem[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  name: productNames[i % productNames.length],
  sku: `SKU-${String(i + 1).padStart(4, "0")}`,
  price: Math.floor(Math.random() * 2000) + 99,
  stock: Math.floor(Math.random() * 150),
  status: statuses[i % 10 === 0 ? 2 : i % 7 === 0 ? 1 : 0],
  category: categories[i % categories.length],
  image: `https://picsum.photos/seed/${i + 1}/40/40`,
}));
