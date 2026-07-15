import { orderMockRepository } from "@/domains/sales/all-orders/api/order-mock-repository";
import { createFulfillmentBoardFixture, mapOrderToFulfillmentTicket } from "./fulfillment-board";
import type {
  ApiFulfillmentStage,
  ApiFulfillmentTicket,
  ApiUserError,
  FulfillmentBoardQueryVariables,
  FulfillmentStageCreateInput,
  FulfillmentStageDeleteInput,
  FulfillmentStageUpdateInput,
  FulfillmentStagesReorderInput,
  FulfillmentTicketAppendInput,
  FulfillmentTicketMoveInput,
} from "../graphql/operation-types";
import { FulfillmentTicketOrderField, FulfillmentOrderStatus } from "../graphql/operation-types";

const fixture = createFulfillmentBoardFixture();
let stages = fixture.stages;
let tickets = fixture.tickets;

function syncOrderRepository() {
  const orders = orderMockRepository.snapshot();
  const orderIds = new Set(orders.map((order) => order.id));
  tickets = tickets.filter((ticket) => orderIds.has(ticket.order.id));
  const firstStage = [...stages].sort((left, right) => left.sortIndex - right.sortIndex)[0];
  orders.forEach((order, index) => {
    const existing = tickets.find((ticket) => ticket.order.id === order.id);
    if (existing) {
      const mapped = mapOrderToFulfillmentTicket(order, index, existing.stageId, existing.sortIndex);
      existing.order = mapped.order;
      return;
    }
    if (!firstStage) return;
    const sortIndex = tickets.filter((ticket) => ticket.stageId === firstStage.id).length;
    tickets.push(mapOrderToFulfillmentTicket(order, index, firstStage.id, sortIndex));
  });
}

const clone = <T,>(value: T): T => structuredClone(value);
const cursor = (scope: string, index: number) => btoa(`${scope}:${index}`);
const cursorIndex = (value?: string | null) => {
  if (!value) return null;
  try { return Number(atob(value).split(":").at(-1)); } catch { return null; }
};
const userError = (code: string, message: string, field?: string): ApiUserError => ({
  code,
  message,
  field: field ? ["input", field] : null,
});
const emptyConnection = () => ({
  edges: [],
  pageInfo: { startCursor: null, endCursor: null, hasNextPage: false, hasPreviousPage: false },
  totalCount: 0,
});

function stageView(stage: ApiFulfillmentStage, stageTickets: ApiFulfillmentTicket[] = []) {
  return { ...clone(stage), ticketConnection: connection(stage.id, stageTickets, stageTickets.length) };
}

function connection(scope: string, input: ApiFulfillmentTicket[], first: number) {
  const slice = input.slice(0, first);
  return {
    edges: slice.map((node, index) => ({ cursor: cursor(scope, index), node: clone(node) })),
    pageInfo: {
      startCursor: slice.length ? cursor(scope, 0) : null,
      endCursor: slice.length ? cursor(scope, slice.length - 1) : null,
      hasPreviousPage: false,
      hasNextPage: slice.length < input.length,
    },
    totalCount: input.length,
  };
}

function matches(ticket: ApiFulfillmentTicket, variables: FulfillmentBoardQueryVariables) {
  const where = variables.where;
  if (!where) return true;
  if (!where.includeArchivedCancelled && [FulfillmentOrderStatus.Archived, FulfillmentOrderStatus.Cancelled].includes(ticket.order.status)) return false;
  if (where.orderStatus?.length && !where.orderStatus.includes(ticket.order.status)) return false;
  if (where.paymentStatus?.length && (!ticket.order.paymentSummary || !where.paymentStatus.includes(ticket.order.paymentSummary.status))) return false;
  if (where.fulfillmentStatus?.length && !ticket.order.fulfillmentSummary.some((item) => where.fulfillmentStatus!.includes(item.status))) return false;
  if (where.createdAtFrom && ticket.createdAt < where.createdAtFrom) return false;
  if (where.createdAtTo && ticket.createdAt > where.createdAtTo) return false;
  if (where.search) {
    const customer = ticket.order.customer;
    const haystack = [ticket.order.number, customer?.firstName, customer?.lastName, customer?.email, customer?.phone].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(where.search.trim().toLowerCase())) return false;
  }
  return true;
}

function sorted(input: ApiFulfillmentTicket[], variables: FulfillmentBoardQueryVariables) {
  const rules = variables.orderBy?.length ? variables.orderBy : [{ field: FulfillmentTicketOrderField.SortIndex, direction: "ASC" as const }];
  const accessors: Record<FulfillmentTicketOrderField, (ticket: ApiFulfillmentTicket) => string | number> = {
    [FulfillmentTicketOrderField.SortIndex]: (ticket) => ticket.sortIndex,
    [FulfillmentTicketOrderField.OrderNumber]: (ticket) => Number(ticket.order.number),
    [FulfillmentTicketOrderField.CreatedAt]: (ticket) => ticket.createdAt,
    [FulfillmentTicketOrderField.UpdatedAt]: (ticket) => ticket.updatedAt,
    [FulfillmentTicketOrderField.TotalAmount]: (ticket) => Number(ticket.order.totalAmount.amount),
  };
  return [...input].sort((a, b) => {
    for (const rule of rules) {
      const left = accessors[rule.field](a);
      const right = accessors[rule.field](b);
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      if (result) return rule.direction === "ASC" ? result : -result;
    }
    return 0;
  });
}

function versionedStage(id: string, expectedVersion: number) {
  const stage = stages.find((item) => item.id === id);
  if (!stage) return { stage: null, error: userError("NOT_FOUND", "Fulfillment stage not found.") };
  if (stage.version !== expectedVersion) return { stage: null, error: userError("VERSION_CONFLICT", "This stage was changed by another operator. Reload and try again.") };
  return { stage, error: null };
}

export const fulfillmentMockStore = {
  query(variables: FulfillmentBoardQueryVariables) {
    syncOrderRepository();
    const orderedStages = [...stages].sort((a, b) => a.sortIndex - b.sortIndex);
    const after = cursorIndex(variables.after);
    const before = cursorIndex(variables.before);
    let start = after == null ? 0 : after + 1;
    let end = before == null ? orderedStages.length : before;
    if (variables.last != null) start = Math.max(0, end - variables.last);
    else end = Math.min(end, start + (variables.first ?? orderedStages.length));
    const page = orderedStages.slice(start, end).map((stage) => stageView(
      stage,
      sorted(tickets.filter((ticket) => ticket.stageId === stage.id && matches(ticket, variables)), variables),
    ));
    page.forEach((stage) => {
      const all = stage.ticketConnection.edges.map((edge) => edge.node);
      stage.ticketConnection = connection(stage.id, all, variables.ticketsFirst);
    });
    return {
      fulfillmentQuery: {
        stages: {
          edges: page.map((node, index) => ({ cursor: cursor("stage", start + index), node })),
          pageInfo: {
            startCursor: page.length ? cursor("stage", start) : null,
            endCursor: page.length ? cursor("stage", start + page.length - 1) : null,
            hasPreviousPage: start > 0,
            hasNextPage: end < orderedStages.length,
          },
          totalCount: orderedStages.length,
        },
      },
    };
  },
  getStage(id: string) {
    syncOrderRepository();
    const stage = stages.find((item) => item.id === id);
    return stage ? stageView(stage, tickets.filter((ticket) => ticket.stageId === id)) : null;
  },
  createStage(input: FulfillmentStageCreateInput) {
    if (!input.title.trim()) return { stage: null, userErrors: [userError("REQUIRED", "Title is required.", "title")] };
    if (stages.some((item) => item.handle === input.handle)) return { stage: null, userErrors: [userError("NOT_UNIQUE", "Handle is already in use.", "handle")] };
    const now = new Date().toISOString();
    const stage: ApiFulfillmentStage = { id: crypto.randomUUID(), version: 1, title: input.title.trim(), handle: input.handle, sortIndex: input.sortIndex, createdAt: now, updatedAt: now, ticketConnection: emptyConnection() };
    stages = [...stages, stage];
    return { stage: clone(stage), userErrors: [] };
  },
  updateStage(input: FulfillmentStageUpdateInput) {
    const current = versionedStage(input.id, input.expectedVersion);
    if (!current.stage) return { stage: null, userErrors: [current.error!] };
    if (input.handle && stages.some((item) => item.id !== input.id && item.handle === input.handle)) return { stage: null, userErrors: [userError("NOT_UNIQUE", "Handle is already in use.", "handle")] };
    Object.assign(current.stage, { title: input.title ?? current.stage.title, handle: input.handle ?? current.stage.handle, version: current.stage.version + 1, updatedAt: new Date().toISOString() });
    return { stage: clone(current.stage), userErrors: [] };
  },
  deleteStage(input: FulfillmentStageDeleteInput) {
    const current = versionedStage(input.id, input.expectedVersion);
    if (!current.stage) return { deletedStageId: null, userErrors: [current.error!] };
    if (tickets.some((ticket) => ticket.stageId === input.id)) return { deletedStageId: null, userErrors: [userError("STAGE_NOT_EMPTY", "Move all tickets before deleting this stage.")] };
    stages = stages.filter((item) => item.id !== input.id);
    return { deletedStageId: input.id, userErrors: [] };
  },
  reorderStages(input: FulfillmentStagesReorderInput) {
    for (const update of input.stages) {
      const current = versionedStage(update.id, update.expectedVersion);
      if (!current.stage) return { stages: null, userErrors: [current.error!] };
    }
    const now = new Date().toISOString();
    input.stages.forEach((update) => {
      const stage = stages.find((item) => item.id === update.id)!;
      stage.sortIndex = update.sortIndex;
      stage.version += 1;
      stage.updatedAt = now;
    });
    return { stages: clone(stages.map((stage) => stageView(stage))), userErrors: [] };
  },
  moveTicket(input: FulfillmentTicketMoveInput) {
    const ticket = tickets.find((item) => item.id === input.ticketId);
    if (!ticket) return { ticket: null, userErrors: [userError("NOT_FOUND", "Fulfillment ticket not found.")] };
    if (ticket.version !== input.expectedVersion) return { ticket: null, userErrors: [userError("VERSION_CONFLICT", "This fulfillment was changed by another operator. Reload and try again.")] };
    if (ticket.stageId !== input.sourceStageId) return { ticket: null, userErrors: [userError("VERSION_CONFLICT", "This ticket has already moved. Reload and try again.")] };
    if (!stages.some((stage) => stage.id === input.targetStageId)) return { ticket: null, userErrors: [userError("NOT_FOUND", "Target stage not found.", "targetStageId")] };
    const target = tickets.filter((item) => item.stageId === input.targetStageId && item.id !== ticket.id).sort((a, b) => a.sortIndex - b.sortIndex);
    const afterIndex = input.afterTicketId == null ? -1 : target.findIndex((item) => item.id === input.afterTicketId);
    const insertAt = input.afterTicketId == null ? 0 : afterIndex + 1;
    target.splice(Math.max(0, insertAt), 0, ticket);
    target.forEach((item, index) => { item.stageId = input.targetStageId; item.sortIndex = index; });
    if (input.sourceStageId !== input.targetStageId) {
      tickets.filter((item) => item.stageId === input.sourceStageId && item.id !== ticket.id).sort((a, b) => a.sortIndex - b.sortIndex).forEach((item, index) => { item.sortIndex = index; });
    }
    ticket.version += 1;
    ticket.updatedAt = new Date().toISOString();
    return { ticket: clone(ticket), userErrors: [] };
  },
  appendTicket(input: FulfillmentTicketAppendInput) {
    const ticket = tickets.find((item) => item.order.id === input.orderId);
    if (!ticket) return { ticket: null, userErrors: [userError("NOT_FOUND", "Order is not available on this board.")] };
    return this.moveTicket({ clientMutationId: input.clientMutationId, ticketId: ticket.id, expectedVersion: ticket.version, sourceStageId: ticket.stageId, targetStageId: input.stageId, afterTicketId: tickets.filter((item) => item.stageId === input.stageId).sort((a, b) => a.sortIndex - b.sortIndex).at(-1)?.id ?? null });
  },
};
