import { FilterType, dateOperators, enumOperators, numberOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ReviewContentAuthorType, ReviewContentKind, ReviewContentStatus } from "@/graphql/types";

const enumOptions = <T extends string>(values: T[]) =>
  values.map((value) => ({
    label: value.toLowerCase().replaceAll("_", " "),
    value,
  }));

export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by moderation status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: enumOptions(Object.values(ReviewContentStatus)),
  },
  {
    key: "kind",
    label: "Content type",
    description: "Filter by review, question, answer, or reply",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "kind",
    options: enumOptions(Object.values(ReviewContentKind)),
  },
  {
    key: "authorType",
    label: "Author type",
    description: "Filter by content author type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "authorType",
    options: enumOptions(Object.values(ReviewContentAuthorType)),
  },
  {
    key: "reportCount",
    label: "Reports",
    description: "Filter by abuse report count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "reportCount",
  },
  {
    key: "updatedAt",
    label: "Updated date",
    description: "Filter by last update date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "updatedAt",
  },
];
