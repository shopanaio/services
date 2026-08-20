import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
  stringOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ReviewNotificationChannel, ReviewRequestStatus } from "@/graphql/types";

const enumOptions = <T extends string>(values: T[]) =>
  values.map((value) => ({ label: value.toLowerCase().replaceAll("_", " "), value }));

export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by request delivery status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: enumOptions(Object.values(ReviewRequestStatus)),
  },
  {
    key: "channel",
    label: "Channel",
    description: "Filter by notification channel",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "channel",
    options: enumOptions(Object.values(ReviewNotificationChannel)),
  },
  {
    key: "locale",
    label: "Locale",
    description: "Filter by request locale",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "locale",
  },
  {
    key: "attemptCount",
    label: "Attempts",
    description: "Filter by delivery attempt count",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "attemptCount",
  },
  {
    key: "scheduledAt",
    label: "Scheduled date",
    description: "Filter by scheduled delivery date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "scheduledAt",
  },
  {
    key: "createdAt",
    label: "Created date",
    description: "Filter by request creation date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
