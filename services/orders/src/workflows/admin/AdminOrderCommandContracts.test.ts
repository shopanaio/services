import {
  adminOrderCommandNames,
  parseAdminOrderPublicInput,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import { adminOrderCommandWorkflowProviders } from "./AdminOrderCommandWorkflows.js";

const id = "018f3f8d-0e6d-7a74-8f80-123456789abc";

describe("Admin order business-logic contract", () => {
  test("registers exactly one workflow provider for every command", () => {
    expect(adminOrderCommandWorkflowProviders).toHaveLength(adminOrderCommandNames.length);
    expect(new Set(adminOrderCommandNames).size).toBe(adminOrderCommandNames.length);
    expect(adminOrderCommandWorkflowProviders.map((provider) => provider.name)).toHaveLength(
      adminOrderCommandNames.length,
    );
  });

  test("rejects tenant identity supplied by an untrusted command DTO", () => {
    expect(() =>
      parseAdminOrderPublicInput("orderArchive", {
        id,

        idempotencyKey: "archive-1",
        storeId: id,
      }),
    ).toThrow("Tenant context is not accepted");
  });

  test("does not require a version token and still validates identifiers", () => {
    expect(() =>
      parseAdminOrderPublicInput("orderArchive", {
        id,

        idempotencyKey: "archive-1",
      }),
    ).not.toThrow();
    expect(() =>
      parseAdminOrderPublicInput("shipmentCancel", {
        shipmentId: "not-an-id",

        reasonCode: "MERCHANT_DECISION",
        idempotencyKey: "shipment-cancel-1",
      }),
    ).toThrow("shipmentId must be a UUID");
  });

  test("accepts command-specific identifiers only with the durable idempotency key", () => {
    expect(
      parseAdminOrderPublicInput("orderReturnReceive", {
        returnId: id,
        locationId: id,

        lines: [
          {
            orderLineId: id,
            receivedQuantity: 2,
            restockableQuantity: 1,
            damagedQuantity: 1,
          },
        ],
        idempotencyKey: "receive-1",
      }),
    ).toMatchObject({ returnId: id });
    expect(() => parseAdminOrderPublicInput("ordersBulkAction", { action: "ARCHIVE" })).toThrow(
      "idempotencyKey is required",
    );
  });

  test("rejects malformed nested money, package and disposition values", () => {
    expect(() =>
      parseAdminOrderPublicInput("orderCreate", {
        idempotencyKey: "create-1",
        lines: [{ title: "Item", quantity: 1, unitPrice: { amount: "1e2", currencyCode: "USD" } }],
      }),
    ).toThrow("non-negative decimal");
    expect(() =>
      parseAdminOrderPublicInput("shipmentCreate", {
        fulfillmentId: id,

        idempotencyKey: "shipment-1",
        packages: [{ items: [{ orderLineId: id, quantity: 0 }] }],
      }),
    ).toThrow("quantity must be positive");
    expect(() =>
      parseAdminOrderPublicInput("orderReturnReceive", {
        returnId: id,
        locationId: id,

        idempotencyKey: "receive-2",
        lines: [
          {
            orderLineId: id,
            receivedQuantity: 2,
            restockableQuantity: 2,
            damagedQuantity: 1,
          },
        ],
      }),
    ).toThrow("disposition quantities are inconsistent");
  });
});
