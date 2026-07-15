export type FulfillmentMockScenario = "success" | "transport-error";

let scenario: FulfillmentMockScenario = "success";

export function setFulfillmentMockScenario(next: FulfillmentMockScenario) {
  scenario = next;
}

export async function runFulfillmentMockTransport<T>(work: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 90));
  if (scenario === "transport-error") {
    throw new Error("The fulfillment mock transport is unavailable.");
  }
  return structuredClone(work());
}
