import { FilterOperator, FilterType } from "@/layouts/filters";
import {
  dateOperators,
  numberOperators,
  stringOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "name",
    label: "Name",
    description: "Filter by synonym group name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "terms",
    label: "Synonym",
    description: "Filter by a synonym value",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "terms",
  },
  {
    key: "locale",
    label: "Locale",
    description: "Filter by locale code",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "locale",
  },
  {
    key: "enabled",
    label: "Status",
    description: "Filter enabled or disabled groups",
    type: FilterType.Boolean,
    operators: [FilterOperator.Eq],
    payloadKey: "enabled",
  },
  {
    key: "valuesCount",
    label: "Synonyms",
    description: "Filter by synonym value count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "valuesCount",
  },
  {
    key: "updatedAt",
    label: "Updated date",
    description: "Filter by last update date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "updatedAt",
  },
];
