import { FilterOperator, FilterType } from "@/layouts/filters";
import { dateOperators, numberOperators, stringOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "name",
    label: "Name",
    description: "Filter by boost name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "phrases",
    label: "Phrase",
    description: "Filter by a trigger phrase",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "phrases",
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
    description: "Filter enabled or disabled boosts",
    type: FilterType.Boolean,
    operators: [FilterOperator.Eq],
    payloadKey: "enabled",
  },
  {
    key: "phrasesCount",
    label: "Phrases",
    description: "Filter by trigger phrase count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "phrasesCount",
  },
  {
    key: "productIds",
    label: "Product",
    description: "Filter by boosted product",
    type: FilterType.Relation,
    operators: [FilterOperator.In],
    payloadKey: "productIds",
    entity: "product",
  },
  {
    key: "productsCount",
    label: "Products",
    description: "Filter by boosted product count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "productsCount",
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
