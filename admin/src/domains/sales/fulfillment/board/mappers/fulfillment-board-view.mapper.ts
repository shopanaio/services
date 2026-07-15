import type { ApiFulfillmentStageConnection } from "../graphql/operation-types";
import type { LegacyFulfillmentBoardView, LegacyFulfillmentColumnView, LegacyFulfillmentTicketView } from "../models/legacy-fulfillment-board-view";

export function mapFulfillmentBoardToLegacyView(connection: ApiFulfillmentStageConnection): LegacyFulfillmentBoardView {
  const columns: LegacyFulfillmentColumnView[] = [];
  const columnsMapping: Record<string, LegacyFulfillmentColumnView> = {};
  const columnTicketsMapping: Record<string, LegacyFulfillmentTicketView[]> = {};
  const ordersMapping: Record<string, LegacyFulfillmentTicketView> = {};
  const ticketsMapping: Record<string, LegacyFulfillmentTicketView> = {};

  connection.edges.forEach(({ node: stage }) => {
    const tickets = stage.ticketConnection.edges.map(({ node: ticket }): LegacyFulfillmentTicketView => ({
      id: ticket.order.id,
      ticketId: ticket.id,
      version: ticket.version,
      stageId: ticket.stageId,
      createdAt: new Date(ticket.order.createdAt),
      orderNumber: ticket.order.number,
      totalAmount: ticket.order.totalAmount,
      customerFirstName: ticket.order.customer?.firstName ?? null,
      customerLastName: ticket.order.customer?.lastName ?? null,
      customerEmail: ticket.order.customer?.email ?? null,
      customerPhone: ticket.order.customer?.phone ?? null,
      shippingAddress: ticket.order.shippingAddress,
      payment: ticket.order.paymentSummary,
      fulfillments: ticket.order.fulfillmentSummary,
      productsInfo: ticket.order.lineItemsSummary,
      tags: ticket.order.tags,
    }));
    const column: LegacyFulfillmentColumnView = {
      id: stage.id,
      version: stage.version,
      slug: stage.handle,
      sortIndex: stage.sortIndex,
      title: stage.title,
      tickets,
    };
    columns.push(column);
    columnsMapping[column.id] = column;
    columnTicketsMapping[column.id] = tickets;
    tickets.forEach((ticket) => {
      ordersMapping[ticket.id] = ticket;
      ticketsMapping[ticket.ticketId] = ticket;
    });
  });
  columns.sort((a, b) => a.sortIndex - b.sortIndex);
  return { columns, columnsMapping, columnTicketsMapping, ordersMapping, ticketsMapping };
}
