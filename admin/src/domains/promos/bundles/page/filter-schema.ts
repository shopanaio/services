import {
  FilterType,
  stringOperators,
  enumOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { BundleType } from "@/graphql/types";

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
      { label: "Fixed Kit", value: BundleType.Fixed },
      { label: "Multipack", value: BundleType.Multipack },
      { label: "Mix & Match", value: BundleType.MixAndMatch },
      { label: "Custom", value: BundleType.Custom },
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
