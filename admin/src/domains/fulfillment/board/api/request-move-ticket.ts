import type { FulfillmentTicketMoveInput, FulfillmentTicketMovePayload } from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestMoveFulfillmentTicket(input: FulfillmentTicketMoveInput): Promise<FulfillmentTicketMovePayload> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.moveTicket(input));
}
