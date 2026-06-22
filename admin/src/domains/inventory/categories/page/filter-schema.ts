import {
  FilterType,
  stringOperators,
  numberOperators,
  dateOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "handle",
    label: "Handle",
    description: "Filter by category handle",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "handle",
  },
  {
    key: "path",
    label: "Path",
    description: "Filter by category path",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "path",
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
