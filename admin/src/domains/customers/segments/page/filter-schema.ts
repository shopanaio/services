import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { CustomerSegmentType } from "@/graphql/types";

export const filterSchema: IFilterSchema[] = [
  {
    key: "type",
    label: "Type",
    description: "Filter by segment membership type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "type",
    options: [
      { label: "Manual", value: CustomerSegmentType.Manual },
      { label: "Dynamic", value: CustomerSegmentType.Dynamic },
    ],
  },
  {
    key: "customersCount",
    label: "Customers",
    description: "Filter by assigned customer count",
    type: FilterType.Integer,
    operators: numberOperators,
    payloadKey: "customersCount",
  },
  {
    key: "createdAt",
    label: "Created",
    description: "Filter by creation date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
  {
    key: "updatedAt",
    label: "Updated",
    description: "Filter by last update date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "updatedAt",
  },
];
