import type { ReactNode } from "react";
import {
  LuDollarSign,
  LuPackageCheck,
  LuSlidersHorizontal,
  LuSparkles,
  LuTag,
} from "react-icons/lu";
import { FacetType } from "@/graphql/types";

export const FACET_TYPE_ICONS: Record<FacetType, ReactNode> = {
  [FacetType.Price]: <LuDollarSign />,
  [FacetType.InStock]: <LuPackageCheck />,
  [FacetType.Tag]: <LuTag />,
  [FacetType.Option]: <LuSlidersHorizontal />,
  [FacetType.Feature]: <LuSparkles />,
};

export function getFacetTypeIcon(facetType: FacetType): ReactNode {
  return FACET_TYPE_ICONS[facetType];
}
