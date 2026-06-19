import {
  FilterType,
  numberOperators,
  stringOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

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
    key: "reserved",
    label: "Reserved",
    description: "Filter by reserved quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "reserved",
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
