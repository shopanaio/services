import { FilterType, dateOperators, enumOperators, stringOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { ReviewExternalSyncDirection, ReviewExternalSyncStatus } from "@/graphql/types";

const enumOptions = <T extends string>(values: T[]) => values.map((value) => ({ label: value.toLowerCase().replaceAll("_", " "), value }));

export const filterSchema: IFilterSchema[] = [
  { key: "syncStatus", label: "Status", description: "Filter by synchronization status", type: FilterType.Enum, operators: enumOperators, payloadKey: "syncStatus", options: enumOptions(Object.values(ReviewExternalSyncStatus)) },
  { key: "direction", label: "Direction", description: "Filter by synchronization direction", type: FilterType.Enum, operators: enumOperators, payloadKey: "direction", options: enumOptions(Object.values(ReviewExternalSyncDirection)) },
  { key: "externalSystem", label: "External system", description: "Filter by external system", type: FilterType.String, operators: stringOperators, payloadKey: "externalSystem" },
  { key: "externalType", label: "External type", description: "Filter by external content type", type: FilterType.String, operators: stringOperators, payloadKey: "externalType" },
  { key: "lastSyncedAt", label: "Last sync date", description: "Filter by last successful sync date", type: FilterType.DateRange, operators: dateOperators, payloadKey: "lastSyncedAt" },
  { key: "updatedAt", label: "Updated date", description: "Filter by reference update date", type: FilterType.DateRange, operators: dateOperators, payloadKey: "updatedAt" },
];
