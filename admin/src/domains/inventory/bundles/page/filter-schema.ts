import { FilterType, enumOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { BundleType } from "@/graphql/types";
import { productLikeBaseFilterSchema } from "@/domains/inventory/products/list-page";

export const filterSchema: IFilterSchema[] = [
  ...productLikeBaseFilterSchema,
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
];
