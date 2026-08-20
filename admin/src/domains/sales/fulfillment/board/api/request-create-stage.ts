import type {
  FulfillmentStageCreateInput,
  FulfillmentStageMutationPayload,
} from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestCreateFulfillmentStage(
  input: FulfillmentStageCreateInput,
): Promise<FulfillmentStageMutationPayload> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.createStage(input));
}
