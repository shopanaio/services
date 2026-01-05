import {
  FilterType,
  numberOperators,
  stringOperators,
  type IFilterSchema,
} from "@/layouts/filters";

export const filterSchema: IFilterSchema[] = [
  {
    key: "sku",
    label: "SKU",
    description: "Filter by SKU",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "sku",
  },
  {
    key: "available",
    label: "Available",
    description: "Filter by available quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "available",
  },
  {
    key: "committed",
    label: "Committed",
    description: "Filter by committed quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "committed",
  },
  {
    key: "unavailable",
    label: "Unavailable",
    description: "Filter by unavailable quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "unavailable",
  },
];
