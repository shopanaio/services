import type { ReactNode } from "react";
import { LuCircleCheck as CheckCircleOutlined, LuSquareCheckBig as CheckSquareOutlined, LuMenu as MenuOutlined, LuSlidersHorizontal as SlidersOutlined, LuList as UnorderedListOutlined } from "react-icons/lu";
import {
  LuDollarSign,
  LuPackageCheck,
  LuSlidersHorizontal,
  LuSparkles,
  LuTag,
} from "react-icons/lu";
import { FacetScopeType, FacetType, FacetUiType } from "@/graphql/types";

interface FacetTypeUiMapping {
  label: string;
  shortLabel: string;
  sourceTypeLabel: string;
  icon: ReactNode;
}

interface FacetUiTypeMapping {
  label: string;
  icon: ReactNode;
}

interface FacetScopeUiMapping {
  label: string;
  description: string;
}

export const FACET_UI_MAPPINGS: {
  facetTypes: Record<FacetType, FacetTypeUiMapping>;
  uiTypes: Record<FacetUiType, FacetUiTypeMapping>;
  scopes: Record<FacetScopeType, FacetScopeUiMapping>;
} = {
  facetTypes: {
    [FacetType.Price]: {
      label: "Price",
      shortLabel: "Price",
      sourceTypeLabel: "Standard",
      icon: <LuDollarSign />,
    },
    [FacetType.InStock]: {
      label: "Availability",
      shortLabel: "Availability",
      sourceTypeLabel: "Standard",
      icon: <LuPackageCheck />,
    },
    [FacetType.Tag]: {
      label: "Product Tags",
      shortLabel: "Tags",
      sourceTypeLabel: "Standard",
      icon: <LuTag />,
    },
    [FacetType.Option]: {
      label: "Product Options",
      shortLabel: "Options",
      sourceTypeLabel: "Product Option",
      icon: <LuSlidersHorizontal />,
    },
    [FacetType.Feature]: {
      label: "Product Features",
      shortLabel: "Features",
      sourceTypeLabel: "Product Feature",
      icon: <LuSparkles />,
    },
  },
  uiTypes: {
    [FacetUiType.Checkbox]: {
      label: "Checkbox",
      icon: <CheckSquareOutlined />,
    },
    [FacetUiType.Radio]: {
      label: "Radio",
      icon: <CheckCircleOutlined />,
    },
    [FacetUiType.Dropdown]: {
      label: "Dropdown",
      icon: <MenuOutlined />,
    },
    [FacetUiType.Range]: {
      label: "Range",
      icon: <SlidersOutlined />,
    },
    [FacetUiType.Boolean]: {
      label: "Boolean",
      icon: <UnorderedListOutlined />,
    },
  },
  scopes: {
    [FacetScopeType.Search]: {
      label: "Search",
      description: "Listings without a category context",
    },
    [FacetScopeType.Category]: {
      label: "Categories",
      description: "All category-scoped listings",
    },
  },
};

export function getFacetSourceTypeLabel(facetType: FacetType): string {
  return FACET_UI_MAPPINGS.facetTypes[facetType].sourceTypeLabel;
}

export function getFacetTypeIcon(facetType: FacetType): ReactNode {
  return FACET_UI_MAPPINGS.facetTypes[facetType].icon;
}

export function getFacetSourceHandleLabel(
  facetType: FacetType,
  handle: string,
): string | null {
  void handle;
  return FACET_UI_MAPPINGS.facetTypes[facetType].label ?? null;
}

export function getFacetUiTypeOptions(
  uiTypes: FacetUiType[],
): Array<{ key: FacetUiType; label: string; icon: ReactNode }> {
  return uiTypes.map((uiType) => ({
    key: uiType,
    ...FACET_UI_MAPPINGS.uiTypes[uiType],
  }));
}

export function getFacetScopeLabel(scope: FacetScopeType): string {
  return FACET_UI_MAPPINGS.scopes[scope].label;
}
