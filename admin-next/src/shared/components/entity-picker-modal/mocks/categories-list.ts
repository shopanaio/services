/**
 * Mock data for Categories list
 */

export interface ICategoryListItem {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  productsCount: number;
  parentId: string | null;
  image: string | null;
}

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

export const categoryStatuses: ICategoryListItem["status"][] = [
  "active",
  "inactive",
];

export const mockCategoriesList: ICategoryListItem[] = Array.from(
  { length: 30 },
  (_, i) => ({
    id: `cat-${i + 1}`,
    name: categoryNames[i % categoryNames.length],
    slug: categoryNames[i % categoryNames.length]
      .toLowerCase()
      .replace(/[&\s]+/g, "-"),
    status: categoryStatuses[i % 7 === 0 ? 1 : 0],
    productsCount: Math.floor(Math.random() * 200),
    parentId: i > 5 && i % 3 === 0 ? `cat-${Math.floor(i / 5)}` : null,
    image: i % 2 === 0 ? `https://picsum.photos/seed/cat-${i + 1}/40/40` : null,
  })
);
