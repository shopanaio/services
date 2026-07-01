import { FilterOperator, FilterType } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { FacetType, FacetUiType } from "@/graphql/types";
import { FACET_UI_MAPPINGS } from "../mappers";

export const filterSchema: IFilterSchema[] = [
  {
    key: "facetType",
    label: "Source",
    description: "Filter by facet source",
    type: FilterType.Enum,
    operators: [FilterOperator.In],
    payloadKey: "facetType",
    options: Object.values(FacetType).map((value) => ({
      label: FACET_UI_MAPPINGS.facetTypes[value].label,
      value,
    })),
  },
  {
    key: "uiType",
    label: "UI type",
    description: "Filter by storefront control",
    type: FilterType.Enum,
    operators: [FilterOperator.In],
    payloadKey: "uiType",
    options: Object.values(FacetUiType).map((value) => ({
      label: FACET_UI_MAPPINGS.uiTypes[value].label,
      value,
    })),
  },
  {
    key: "hasValues",
    label: "Has values",
    description: "Show discrete or computed facets",
    type: FilterType.Boolean,
    operators: [FilterOperator.Is],
    payloadKey: "hasValues",
  },
];
