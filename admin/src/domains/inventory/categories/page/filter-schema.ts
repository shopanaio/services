import {
  FilterType,
  enumOperators,
  stringOperators,
  numberOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by category status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Published", value: "published" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    key: "name",
    label: "Name",
    description: "Filter by category name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "productsCount",
    label: "Products",
    description: "Filter by product count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "productsCount",
  },
];
