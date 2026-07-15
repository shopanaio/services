import type {
  ApiFulfillmentAddressSummary,
  ApiFulfillmentLineItemSummary,
  ApiFulfillmentStatusSummary,
  ApiFulfillmentTag,
  ApiMoney,
  ApiPaymentSummary,
} from "../graphql/operation-types";

export interface LegacyFulfillmentColumnView {
  id: string;
  version: number;
  slug: string;
  sortIndex: number;
  title: string;
  tickets: LegacyFulfillmentTicketView[];
}

export interface LegacyFulfillmentTicketView {
  id: string;
  ticketId: string;
  version: number;
  stageId: string;
  createdAt: Date;
  orderNumber: number | string;
  totalAmount: ApiMoney;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: ApiFulfillmentAddressSummary | null;
  payment: ApiPaymentSummary | null;
  fulfillments: ApiFulfillmentStatusSummary[];
  productsInfo: ApiFulfillmentLineItemSummary[];
  tags: ApiFulfillmentTag[];
}

export interface LegacyFulfillmentBoardView {
  columns: LegacyFulfillmentColumnView[];
  columnsMapping: Record<string, LegacyFulfillmentColumnView>;
  columnTicketsMapping: Record<string, LegacyFulfillmentTicketView[]>;
  ordersMapping: Record<string, LegacyFulfillmentTicketView>;
  ticketsMapping: Record<string, LegacyFulfillmentTicketView>;
}
