import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
  stringOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import {
  DiscountEffectiveStatus,
  DiscountKind,
  DiscountMethod,
} from "@/graphql/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "effectiveStatus",
    label: "Status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "effectiveStatus",
    options: Object.values(DiscountEffectiveStatus).map((value) => ({
      label: value,
      value,
    })),
  },
  {
    key: "method",
    label: "Method",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "method",
    options: Object.values(DiscountMethod).map((value) => ({
      label: value,
      value,
    })),
  },
  {
    key: "kind",
    label: "Discount type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "kind",
    options: Object.values(DiscountKind).map((value) => ({
      label: value.replaceAll("_", " "),
      value,
    })),
  },
  {
    key: "usageCount",
    label: "Usage count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "usageCount",
  },
  {
    key: "startsAt",
    label: "Start date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "startsAt",
  },
  {
    key: "endsAt",
    label: "End date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "endsAt",
  },
  {
    key: "channelCode",
    label: "Channel",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "channelCode",
  },
  {
    key: "tag",
    label: "Tag",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "tag",
  },
];
