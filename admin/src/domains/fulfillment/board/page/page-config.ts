import type { FulfillmentBoardQueryVariables, FulfillmentStatus, FulfillmentTicketOrderByInput, FulfillmentTicketWhereInput } from "../graphql/operation-types";
import { FulfillmentTicketOrderField } from "../graphql/operation-types";

export const fulfillmentSortFieldMapping = {
  manual: FulfillmentTicketOrderField.SortIndex,
  orderNumber: FulfillmentTicketOrderField.OrderNumber,
  createdAt: FulfillmentTicketOrderField.CreatedAt,
  updatedAt: FulfillmentTicketOrderField.UpdatedAt,
  totalAmount: FulfillmentTicketOrderField.TotalAmount,
} as const;

export const DEFAULT_FULFILLMENT_ORDER: FulfillmentTicketOrderByInput[] = [{ field: FulfillmentTicketOrderField.SortIndex, direction: "ASC" }];
export const FULFILLMENT_PAGE_CONFIG_RESET_KEY = "fulfillment-board-v1";

export function buildFulfillmentSearchCondition(search: string): FulfillmentTicketWhereInput | null {
  const value = search.trim();
  return value ? { search: value } : null;
}

export function buildFulfillmentBoardQueryVariables(config: { search: string; includeArchivedCancelled: boolean; fulfillmentStatus?: FulfillmentStatus[]; orderBy: FulfillmentTicketOrderByInput[]; ticketsFirst?: number }): FulfillmentBoardQueryVariables {
  return {
    first: 50,
    ticketsFirst: config.ticketsFirst ?? 100,
    where: { ...(buildFulfillmentSearchCondition(config.search) ?? {}), includeArchivedCancelled: config.includeArchivedCancelled, fulfillmentStatus: config.fulfillmentStatus?.length ? config.fulfillmentStatus : undefined },
    orderBy: config.orderBy,
  };
}
