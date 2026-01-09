/**
 * Mock data for Tags list
 */

export interface ITagListItem {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  productsCount: number;
  color: string;
}

const tagNames = [
  "New Arrival",
  "Best Seller",
  "Sale",
  "Limited Edition",
  "Trending",
  "Eco-Friendly",
  "Handmade",
  "Premium",
  "Clearance",
  "Gift Idea",
  "Seasonal",
  "Exclusive",
  "Featured",
  "Organic",
  "Imported",
  "Popular",
  "Staff Pick",
  "Top Rated",
  "Free Shipping",
  "Bundle Deal",
];

const tagColors = [
  "#52c41a",
  "#faad14",
  "#ff4d4f",
  "#722ed1",
  "#1677ff",
  "#13c2c2",
  "#eb2f96",
  "#fadb14",
  "#fa541c",
  "#a0d911",
];

export const tagStatuses: ITagListItem["status"][] = ["active", "inactive"];

export const mockTagsList: ITagListItem[] = Array.from(
  { length: 20 },
  (_, i) => ({
    id: `tag-${i + 1}`,
    name: tagNames[i % tagNames.length],
    slug: tagNames[i % tagNames.length]
      .toLowerCase()
      .replace(/[&\s]+/g, "-"),
    status: tagStatuses[i % 7 === 0 ? 1 : 0],
    productsCount: Math.floor(Math.random() * 150),
    color: tagColors[i % tagColors.length],
  })
);
