import type { SortFieldMapping } from "@/hooks";

export interface NavigationWhereInput {
  _and?: NavigationWhereInput[];
  _or?: NavigationWhereInput[];
  title?: Record<string, unknown>;
  status?: Record<string, unknown>;
  createdAt?: Record<string, unknown>;
  updatedAt?: Record<string, unknown>;
}

export type NavigationOrderField =
  | "TITLE"
  | "STATUS"
  | "CREATED_AT"
  | "UPDATED_AT";

export const navigationSortFieldMapping: SortFieldMapping<NavigationOrderField> = {
  title: "TITLE",
  status: "STATUS",
  createdAt: "CREATED_AT",
  updatedAt: "UPDATED_AT",
};

export const buildNavigationSearchCondition = (
  search: string,
): Partial<NavigationWhereInput> => ({
  _or: [
    { title: { _containsi: search } },
  ],
});
