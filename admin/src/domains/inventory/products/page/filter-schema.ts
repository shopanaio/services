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
      { label: "Published", value: "published" },
      { label: "Draft", value: "draft" },
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
      { label: "Phone", value: "Phone" },
      { label: "Laptop", value: "Laptop" },
      { label: "Audio", value: "Audio" },
      { label: "Gaming", value: "Gaming" },
      { label: "Accessory", value: "Accessory" },
    ],
  },
  {
    key: "brand",
    label: "Brand",
    description: "Filter by brand",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "brand",
    options: [
      { label: "Apple", value: "Apple" },
      { label: "Samsung", value: "Samsung" },
      { label: "Sony", value: "Sony" },
      { label: "Microsoft", value: "Microsoft" },
      { label: "Logitech", value: "Logitech" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Filter by inventory quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "inventory",
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
