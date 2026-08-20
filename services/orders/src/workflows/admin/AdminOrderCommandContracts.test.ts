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
        expectedVersion: 1,
        idempotencyKey: "archive-1",
        storeId: id,
      }),
    ).toThrow("Tenant context is not accepted");
  });

  test("rejects missing and stale-version-shaped command inputs before workflow start", () => {
    expect(() =>
      parseAdminOrderPublicInput("orderArchive", {
        id,
        expectedVersion: 0,
        idempotencyKey: "archive-1",
      }),
    ).toThrow("expectedVersion must be a positive integer");
    expect(() =>
      parseAdminOrderPublicInput("shipmentCancel", {
        shipmentId: "not-an-id",
        expectedVersion: 1,
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
        expectedVersion: 2,
        lines: [],
        idempotencyKey: "receive-1",
      }),
    ).toMatchObject({ returnId: id, expectedVersion: 2 });
    expect(() => parseAdminOrderPublicInput("ordersBulkAction", { action: "ARCHIVE" })).toThrow(
      "idempotencyKey is required",
    );
  });
});
