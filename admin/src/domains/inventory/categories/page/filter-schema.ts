import {
  FilterType,
  stringOperators,
  numberOperators,
  dateOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "name",
    label: "Name",
    description: "Filter by category name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "handle",
    label: "Handle",
    description: "Filter by category handle",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "handle",
  },
  {
    key: "productsCount",
    label: "Products",
    description: "Filter by product count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "productsCount",
  },
  {
    key: "depth",
    label: "Depth",
    description: "Filter by hierarchy depth",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "depth",
  },
  {
    key: "publishedAt",
    label: "Published date",
    description: "Filter by published date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "publishedAt",
  },
  {
    key: "createdAt",
    label: "Created date",
    description: "Filter by created date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
  {
    key: "updatedAt",
    label: "Updated date",
    description: "Filter by updated date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "updatedAt",
  },
];
