import type { ApiCategory } from "@/graphql/types";

export type CategorySection =
  | "identity"
  | "content"
  | "hierarchy"
  | "products"
  | "media"
  | "seo"
  | "sort"
  | "status";

export interface CategoryDetailsCardProps {
  category: ApiCategory;
  onRefetch?: () => Promise<unknown>;
}
