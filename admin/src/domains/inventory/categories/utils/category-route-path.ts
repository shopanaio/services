import type { ApiCategory } from "@/graphql/types";

type CategoryRoutePathInput = Pick<ApiCategory, "handle"> & {
  ancestors?: Array<Pick<ApiCategory, "handle">> | null;
};

export function getCategoryRoutePath(category: CategoryRoutePathInput): string {
  const handles = [
    ...(category.ancestors?.map((ancestor) => ancestor.handle) ?? []),
    category.handle,
  ].filter(Boolean);

  return handles.join("/");
}
