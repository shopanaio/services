import {
  FilterType,
  stringOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "name",
    label: "Name",
    description: "Filter by product name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "handle",
    label: "Handle",
    description: "Filter by product handle",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "handle",
  },
  {
    key: "category",
    label: "Category",
    description: "Filter by primary category name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "primaryCategoryName",
  },
];
