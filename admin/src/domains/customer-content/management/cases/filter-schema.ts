import { FilterType, dateOperators, enumOperators, numberOperators, stringOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ReviewModerationCaseStatus } from "@/graphql/types";

export const filterSchema: IFilterSchema[] = [
  { key: "status", label: "Status", description: "Filter by case status", type: FilterType.Enum, operators: enumOperators, payloadKey: "status", options: Object.values(ReviewModerationCaseStatus).map((value) => ({ label: value.toLowerCase().replaceAll("_", " "), value })) },
  { key: "priority", label: "Priority", description: "Filter by moderation priority", type: FilterType.Number, operators: numberOperators, payloadKey: "priority" },
  { key: "reasonCode", label: "Reason code", description: "Filter by case reason code", type: FilterType.String, operators: stringOperators, payloadKey: "reasonCode" },
  { key: "assignee", label: "Assigned principal", description: "Filter by assigned principal ID", type: FilterType.String, operators: stringOperators, payloadKey: "assignedToPrincipalId" },
  { key: "dueAt", label: "Due date", description: "Filter by due date", type: FilterType.DateRange, operators: dateOperators, payloadKey: "dueAt" },
  { key: "createdAt", label: "Created date", description: "Filter by case creation date", type: FilterType.DateRange, operators: dateOperators, payloadKey: "createdAt" },
];
