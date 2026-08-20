import {
  applyOrderIntegrationEventV1Schema,
  completeOrderFulfillmentServiceOperationV1Schema,
} from "./OrderProviderContracts.js";

const id = "018f3f8d-0e6d-7a74-8f80-123456789abc";

describe("Orders provider callback contracts", () => {
  test("accepts an exact versioned fulfillment completion envelope", () => {
    expect(
      completeOrderFulfillmentServiceOperationV1Schema.parse({
        contractVersion: 1,
        operationId: id,
        providerEventId: "evt-1",
        providerSequence: 1,
        status: "COMPLETED",
        externalId: "provider-fulfillment-1",
        externalRevision: "2",
        occurredAt: "2026-08-20T10:00:00.000Z",
        payload: {},
      }),
    ).toMatchObject({ contractVersion: 1, status: "COMPLETED" });
  });

  test("rejects unknown fields and invalid protocol versions before workflow start", () => {
    expect(() =>
      completeOrderFulfillmentServiceOperationV1Schema.parse({
        contractVersion: 2,
        operationId: id,
        providerEventId: "evt-1",
        providerSequence: null,
        status: "COMPLETED",
        externalId: "provider-fulfillment-1",
        externalRevision: null,
        occurredAt: "2026-08-20T10:00:00.000Z",
        payload: {},
      }),
    ).toThrow();
    expect(() =>
      applyOrderIntegrationEventV1Schema.parse({
        contractVersion: 1,
        integrationLinkId: id,
        providerEventId: "evt-2",
        externalOrderId: "external-order-1",
        externalRevision: "4",
        eventType: "EXTERNAL_CHANGED",
        occurredAt: "2026-08-20T10:00:00.000Z",
        payload: {},
        storeId: id,
      }),
    ).toThrow();
  });
});
