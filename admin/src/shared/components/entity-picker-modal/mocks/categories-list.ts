import type { ApiCategory } from "@/graphql/types";
import { createMockApiCategory } from "@/mocks/products/api-builders";

const categoryNames = [
  "Electronics",
  "Smartphones",
  "Laptops & Computers",
  "Audio & Headphones",
  "Gaming",
  "Cameras & Photography",
  "Wearables",
  "Tablets",
  "Accessories",
  "Smart Home",
  "TVs & Monitors",
  "Printers & Office",
  "Networking",
  "Storage & Memory",
  "Software",
  "Clothing",
  "Men's Fashion",
  "Women's Fashion",
  "Kids & Baby",
  "Shoes & Footwear",
  "Sports & Outdoors",
  "Fitness Equipment",
  "Camping & Hiking",
  "Cycling",
  "Home & Garden",
  "Furniture",
  "Kitchen & Dining",
  "Bedding & Bath",
  "Decor",
  "Tools & Hardware",
];

export const mockCategoriesList: ApiCategory[] = Array.from(
  { length: 30 },
  (_, i) =>
    createMockApiCategory({
      id: `cat-${i + 1}`,
      name: categoryNames[i % categoryNames.length],
      handle: categoryNames[i % categoryNames.length]
        .toLowerCase()
        .replace(/[&\s]+/g, "-"),
      isPublished: i % 7 !== 0,
      productsCount: Math.floor(Math.random() * 200),
    }),
);
