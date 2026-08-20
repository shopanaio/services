import type {
  FulfillmentStagesReorderInput,
  FulfillmentStagesReorderPayload,
} from "../graphql/operation-types";
import { fulfillmentMockStore, runFulfillmentMockTransport } from "../mocks";

export async function requestReorderFulfillmentStages(
  input: FulfillmentStagesReorderInput,
): Promise<FulfillmentStagesReorderPayload> {
  return runFulfillmentMockTransport(() => fulfillmentMockStore.reorderStages(input));
}
