import {
  FilterType,
  numberOperators,
  stringOperators,
  enumOperators,
  type IFilterSchema,
} from "@/layouts/filters";

export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by product status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    key: "category",
    label: "Category",
    description: "Filter by category",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "category",
    options: [
      { label: "Electronics", value: "Electronics" },
      { label: "Computers", value: "Computers" },
      { label: "Audio", value: "Audio" },
      { label: "Gaming", value: "Gaming" },
      { label: "Accessories", value: "Accessories" },
    ],
  },
  {
    key: "price",
    label: "Price",
    description: "Filter by price",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "price",
  },
  {
    key: "stock",
    label: "Stock",
    description: "Filter by stock quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "stock",
  },
  {
    key: "name",
    label: "Name",
    description: "Filter by product name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
];
