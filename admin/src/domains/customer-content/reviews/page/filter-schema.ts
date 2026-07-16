import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
  relationOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import {
  ReviewContentStatus,
  ReviewVerificationStatus,
} from "@/graphql/types";

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
      { label: "Pending", value: ReviewContentStatus.Pending },
      { label: "Published", value: ReviewContentStatus.Published },
      { label: "Rejected", value: ReviewContentStatus.Rejected },
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
    key: "verificationStatus",
    label: "Verification",
    description: "Filter by purchase verification status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "verificationStatus",
    options: [
      { label: "Verified", value: ReviewVerificationStatus.Verified },
      { label: "Unverified", value: ReviewVerificationStatus.Unverified },
      { label: "Revoked", value: ReviewVerificationStatus.Revoked },
    ],
  },
  {
    key: "mediaCount",
    label: "Media count",
    description: "Filter by the number of customer media items",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "mediaCount",
  },
  {
    key: "reportCount",
    label: "Abuse reports",
    description: "Filter by the number of customer abuse reports",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "reportCount",
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
