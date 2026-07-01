import type { ReactNode } from "react";
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  MenuOutlined,
  SlidersOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  LuDollarSign,
  LuPackageCheck,
  LuSlidersHorizontal,
  LuSparkles,
  LuTag,
} from "react-icons/lu";
import { FacetType, FacetUiType } from "@/graphql/types";

interface FacetTypeUiMapping {
  label?: string;
  sourceTypeLabel: string;
  icon: ReactNode;
}

interface FacetUiTypeMapping {
  label: string;
  icon: ReactNode;
}

export const FACET_UI_MAPPINGS: {
  facetTypes: Record<FacetType, FacetTypeUiMapping>;
  uiTypes: Record<FacetUiType, FacetUiTypeMapping>;
} = {
  facetTypes: {
    [FacetType.Price]: {
      label: "Price",
      sourceTypeLabel: "Standard",
      icon: <LuDollarSign />,
    },
    [FacetType.InStock]: {
      label: "Availability",
      sourceTypeLabel: "Standard",
      icon: <LuPackageCheck />,
    },
    [FacetType.Tag]: {
      label: "Product Tags",
      sourceTypeLabel: "Standard",
      icon: <LuTag />,
    },
    [FacetType.Option]: {
      sourceTypeLabel: "Product Option",
      icon: <LuSlidersHorizontal />,
    },
    [FacetType.Feature]: {
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
