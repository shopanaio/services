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
    description: "Filter by tag name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "handle",
    label: "Handle",
    description: "Filter by tag handle",
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
    key: "createdAt",
    label: "Created date",
    description: "Filter by created date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
