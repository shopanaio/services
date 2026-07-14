import { FilterOperator, FilterType } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { FacetScopeType, FacetType, FacetUiType } from "@/graphql/types";
import { FACET_UI_MAPPINGS } from "../mappers";

export const facetTypeFilterSchema: IFilterSchema = {
  key: "facetType",
  label: "Source Type",
  description: "Filter by source type",
  type: FilterType.Enum,
  operators: [FilterOperator.In],
  payloadKey: "facetType",
  options: Object.values(FacetType).map((value) => ({
    label: FACET_UI_MAPPINGS.facetTypes[value].label,
    value,
  })),
};

const facetUiTypeFilterSchema: IFilterSchema = {
  key: "uiType",
  label: "Display Type",
  description: "Filter by storefront control",
  type: FilterType.Enum,
  operators: [FilterOperator.In],
  payloadKey: "uiType",
  options: Object.values(FacetUiType).map((value) => ({
    label: FACET_UI_MAPPINGS.uiTypes[value].label,
    value,
  })),
};

const facetScopeFilterSchema: IFilterSchema = {
  key: "scopes",
  label: "Listing context",
  description: "Filter by where the filter is available",
  type: FilterType.Enum,
  operators: [FilterOperator.In],
  payloadKey: "scopes",
  options: Object.values(FacetScopeType).map((value) => ({
    label: FACET_UI_MAPPINGS.scopes[value].label,
    value,
  })),
};

export const filterSchema: IFilterSchema[] = [
  facetTypeFilterSchema,
  facetUiTypeFilterSchema,
  facetScopeFilterSchema,
  {
    key: "hasValues",
    label: "Has values",
    description: "Show discrete or computed filters",
    type: FilterType.Boolean,
    operators: [FilterOperator.Is],
    payloadKey: "hasValues",
  },
];
