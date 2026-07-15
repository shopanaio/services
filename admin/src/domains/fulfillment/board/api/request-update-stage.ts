import type { FulfillmentStageMutationPayload, FulfillmentStageUpdateInput } from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestUpdateFulfillmentStage(input: FulfillmentStageUpdateInput): Promise<FulfillmentStageMutationPayload> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.updateStage(input));
}
