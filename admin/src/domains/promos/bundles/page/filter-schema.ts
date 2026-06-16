import {
  FilterType,
  stringOperators,
  enumOperators,
  type IFilterSchema,
} from "@/layouts/filters";

export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by bundle status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Published", value: "published" },
      { label: "Draft", value: "draft" },
    ],
  },
  {
    key: "bundleType",
    label: "Bundle Type",
    description: "Filter by bundle type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "bundleType",
    options: [
      { label: "Fixed Kit", value: "FIXED" },
      { label: "Multipack", value: "MULTIPACK" },
      { label: "Mix & Match", value: "MIX_AND_MATCH" },
      { label: "Custom", value: "null" },
    ],
  },
  {
    key: "name",
    label: "Name",
    description: "Filter by bundle name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
];
