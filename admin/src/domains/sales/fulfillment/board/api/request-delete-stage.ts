import type {
  FulfillmentStageDeleteInput,
  FulfillmentStageDeletePayload,
} from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestDeleteFulfillmentStage(
  input: FulfillmentStageDeleteInput,
): Promise<FulfillmentStageDeletePayload> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.deleteStage(input));
}
