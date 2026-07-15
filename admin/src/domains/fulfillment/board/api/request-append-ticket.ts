import type { FulfillmentTicketAppendInput, FulfillmentTicketAppendPayload } from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestAppendFulfillmentTicket(input: FulfillmentTicketAppendInput): Promise<FulfillmentTicketAppendPayload> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.appendTicket(input));
}
