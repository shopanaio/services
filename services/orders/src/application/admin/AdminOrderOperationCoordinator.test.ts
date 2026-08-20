import { describe, expect, jest, test } from "@jest/globals";
import type { AdminOrderCommandResult } from "../../domain/admin/AdminOrderCommandContracts.js";
import { executeAdminOrderOperation } from "./AdminOrderOperationCoordinator.js";

const result: AdminOrderCommandResult = {
  command: "orderCancel",
  orderId: "018f3f8d-0e6d-7a74-8f80-123456789abc",
  orderVersion: 3,
  resourceId: null,
  operationId: "018f3f8d-0e6d-7a74-8f80-123456789abd",
  duplicate: false,
  deleted: false,
};

describe("Admin order operation coordinator", () => {
  test("does not mark a completed operation failed when event publication fails", async () => {
    const finish = jest
      .fn<(succeeded: boolean, error?: unknown) => Promise<number | null>>()
      .mockResolvedValue(4);
    const publicationError = new Error("EVENTS_UNAVAILABLE");

    await expect(
      executeAdminOrderOperation({
        result,
        loadEffects: async () => [],
        performEffect: async () => null,
        recordAttempt: async () => undefined,
        applyEffect: async () => undefined,
        finish,
        publish: async () => {
          throw publicationError;
        },
      }),
    ).rejects.toBe(publicationError);

    expect(finish).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith(true);
  });

  test("marks the operation failed when a provider effect fails", async () => {
    const finish = jest
      .fn<(succeeded: boolean, error?: unknown) => Promise<number | null>>()
      .mockResolvedValue(null);
    const publish = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const providerError = new Error("PROVIDER_UNAVAILABLE");

    await expect(
      executeAdminOrderOperation({
        result,
        loadEffects: async () => [{ route: "provider.call", params: {} }],
        performEffect: async () => {
          throw providerError;
        },
        recordAttempt: async () => undefined,
        applyEffect: async () => undefined,
        finish,
        publish,
      }),
    ).rejects.toBe(providerError);

    expect(finish).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith(false, providerError);
    expect(publish).not.toHaveBeenCalled();
  });
});
