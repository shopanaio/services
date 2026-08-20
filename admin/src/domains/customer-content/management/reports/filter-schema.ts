import { FilterType, dateOperators, enumOperators, stringOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ReviewContentReportReason, ReviewContentReportStatus } from "@/graphql/types";

const enumOptions = <T extends string>(values: T[]) =>
  values.map((value) => ({ label: value.toLowerCase().replaceAll("_", " "), value }));

export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by report workflow status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: enumOptions(Object.values(ReviewContentReportStatus)),
  },
  {
    key: "reason",
    label: "Reason",
    description: "Filter by reported reason",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "reason",
    options: enumOptions(Object.values(ReviewContentReportReason)),
  },
  {
    key: "assignee",
    label: "Assigned principal",
    description: "Filter by assigned principal ID",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "assignedToPrincipalId",
  },
  {
    key: "createdAt",
    label: "Created date",
    description: "Filter by report creation date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
  {
    key: "resolvedAt",
    label: "Resolved date",
    description: "Filter by report resolution date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "resolvedAt",
  },
];
