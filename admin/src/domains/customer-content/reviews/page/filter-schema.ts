import {
  FilterType,
  booleanOperators,
  dateOperators,
  enumOperators,
  numberOperators,
  relationOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ReviewStatus } from "../graphql/operation-types";

/** Required operational filters for review moderation and customer support. */
export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by moderation status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Pending", value: ReviewStatus.Pending },
      { label: "Published", value: ReviewStatus.Published },
      { label: "Rejected", value: ReviewStatus.Rejected },
    ],
  },
  {
    key: "rating",
    label: "Rating",
    description: "Filter by star rating",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "rating",
    options: [5, 4, 3, 2, 1].map((rating) => ({
      label: `${rating} star${rating === 1 ? "" : "s"}`,
      value: rating,
    })),
  },
  {
    key: "product",
    label: "Product",
    description: "Filter reviews for selected products",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "productId",
    entity: "product",
  },
  {
    key: "verifiedPurchase",
    label: "Verified purchase",
    description: "Filter by verified purchase status",
    type: FilterType.Boolean,
    operators: booleanOperators,
    payloadKey: "isVerifiedPurchase",
  },
  {
    key: "hasMedia",
    label: "Has media",
    description: "Filter reviews with customer photos or videos",
    type: FilterType.Boolean,
    operators: booleanOperators,
    payloadKey: "hasMedia",
  },
  {
    key: "reportedCount",
    label: "Abuse reports",
    description: "Filter by the number of customer abuse reports",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "reportedCount",
  },
  {
    key: "createdAt",
    label: "Submitted date",
    description: "Filter by review submission date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
