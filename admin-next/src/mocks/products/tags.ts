export interface ITagMock {
  id: string;
  title: string;
  slug: string;
  color?: string;
}

export const mockTags: ITagMock[] = [
  { id: "tag-1", title: "New Arrival", slug: "new-arrival", color: "#52c41a" },
  { id: "tag-2", title: "Best Seller", slug: "best-seller", color: "#faad14" },
  { id: "tag-3", title: "Sale", slug: "sale", color: "#ff4d4f" },
  { id: "tag-4", title: "Limited Edition", slug: "limited-edition", color: "#722ed1" },
  { id: "tag-5", title: "Trending", slug: "trending", color: "#1677ff" },
  { id: "tag-6", title: "Eco-Friendly", slug: "eco-friendly", color: "#13c2c2" },
  { id: "tag-7", title: "Handmade", slug: "handmade", color: "#eb2f96" },
  { id: "tag-8", title: "Premium", slug: "premium", color: "#fadb14" },
  { id: "tag-9", title: "Clearance", slug: "clearance", color: "#fa541c" },
  { id: "tag-10", title: "Gift Idea", slug: "gift-idea", color: "#a0d911" },
  { id: "tag-11", title: "Seasonal", slug: "seasonal", color: "#2f54eb" },
  { id: "tag-12", title: "Exclusive", slug: "exclusive", color: "#531dab" },
  { id: "tag-13", title: "Featured", slug: "featured", color: "#08979c" },
  { id: "tag-14", title: "Organic", slug: "organic", color: "#389e0d" },
  { id: "tag-15", title: "Imported", slug: "imported", color: "#d48806" },
];
