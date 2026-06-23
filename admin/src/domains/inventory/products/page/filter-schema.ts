import {
  FilterType,
  priceOperators,
  relationOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "primaryCategory",
    label: "Primary category",
    description: "Filter by primary category",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "primaryCategoryId",
    entity: "category",
  },
  {
    key: "minPrice",
    label: "Min price",
    description: "Filter by product minimum price",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "minPriceMinor",
  },
  {
    key: "maxPrice",
    label: "Max price",
    description: "Filter by product maximum price",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "maxPriceMinor",
  },
  {
    key: "brand",
    label: "Brand",
    description: "Filter by brand/vendor",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "vendorId",
    entity: "vendor",
  },
];
