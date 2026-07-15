import type { FulfillmentBoardQueryData, FulfillmentBoardQueryVariables } from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestFulfillmentBoard(variables: FulfillmentBoardQueryVariables): Promise<FulfillmentBoardQueryData> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.query(variables));
}

export async function requestFulfillmentStage(id: string) {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.getStage(id));
}
