/**
 * Mock data for Categories list page
 */

export interface ICategoryListItem {
  id: string;
  name: string;
  slug: string;
  status: "published" | "draft" | "archived";
  productsCount: number;
  image: string | null;
  parentName: string | null;
}

const categoryData: Array<{
  name: string;
  slug: string;
  parentName: string | null;
}> = [
  { name: "Electronics", slug: "electronics", parentName: null },
  { name: "Smartphones", slug: "smartphones", parentName: "Electronics" },
  { name: "iPhone", slug: "iphone", parentName: "Smartphones" },
  { name: "Samsung Galaxy", slug: "samsung-galaxy", parentName: "Smartphones" },
  { name: "Google Pixel", slug: "google-pixel", parentName: "Smartphones" },
  { name: "Laptops", slug: "laptops", parentName: "Electronics" },
  { name: "Gaming Laptops", slug: "gaming-laptops", parentName: "Laptops" },
  { name: "Ultrabooks", slug: "ultrabooks", parentName: "Laptops" },
  { name: "Audio", slug: "audio", parentName: "Electronics" },
  { name: "Headphones", slug: "headphones", parentName: "Audio" },
  { name: "Speakers", slug: "speakers", parentName: "Audio" },
  { name: "Cameras", slug: "cameras", parentName: "Electronics" },
  { name: "Clothing", slug: "clothing", parentName: null },
  { name: "Men's Clothing", slug: "mens-clothing", parentName: "Clothing" },
  { name: "Women's Clothing", slug: "womens-clothing", parentName: "Clothing" },
  { name: "Kids' Clothing", slug: "kids-clothing", parentName: "Clothing" },
  { name: "Shoes", slug: "shoes", parentName: "Clothing" },
  { name: "Home & Garden", slug: "home-garden", parentName: null },
  { name: "Furniture", slug: "furniture", parentName: "Home & Garden" },
  { name: "Kitchen", slug: "kitchen", parentName: "Home & Garden" },
  { name: "Garden", slug: "garden", parentName: "Home & Garden" },
  { name: "Sports & Outdoors", slug: "sports-outdoors", parentName: null },
  { name: "Fitness", slug: "fitness", parentName: "Sports & Outdoors" },
  { name: "Outdoor Recreation", slug: "outdoor-recreation", parentName: "Sports & Outdoors" },
  { name: "Beauty & Health", slug: "beauty-health", parentName: null },
  { name: "Skincare", slug: "skincare", parentName: "Beauty & Health" },
  { name: "Makeup", slug: "makeup", parentName: "Beauty & Health" },
  { name: "Hair Care", slug: "hair-care", parentName: "Beauty & Health" },
  { name: "Books & Media", slug: "books-media", parentName: null },
  { name: "Books", slug: "books", parentName: "Books & Media" },
];

const statuses: ICategoryListItem["status"][] = [
  "published",
  "draft",
  "archived",
];

export const mockCategoriesList: ICategoryListItem[] = categoryData.map(
  (cat, i) => ({
    id: `cat-${i + 1}`,
    name: cat.name,
    slug: cat.slug,
    status: statuses[i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0],
    productsCount: Math.floor(Math.random() * 200),
    image:
      i % 3 === 0 ? null : `https://picsum.photos/seed/cat-${i + 1}/40/40`,
    parentName: cat.parentName,
  })
);
