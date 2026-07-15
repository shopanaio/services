import {
  dateOperators,
  enumOperators,
  FilterType,
  stringOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const navigationFilterSchema: IFilterSchema[] = [
  {
    key: "title",
    label: "Title",
    description: "Filter by menu title",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "title",
  },
  {
    key: "status",
    label: "Status",
    description: "Filter by menu status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Draft", value: "DRAFT" },
      { label: "Active", value: "ACTIVE" },
      { label: "Archived", value: "ARCHIVED" },
    ],
  },
  {
    key: "createdAt",
    label: "Created at",
    description: "The date the menu was created",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
  {
    key: "updatedAt",
    label: "Updated at",
    description: "The date the menu was last updated",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "updatedAt",
  },
];
