import { describe, expect, test } from "@jest/globals";
import { z } from "zod";
import { toOrderUserErrors } from "./userErrors.js";

describe("Orders Admin GraphQL user errors", () => {
  test("normalizes boundary validation paths and codes", () => {
    const error = z.object({ quantity: z.number().int().positive() }).safeParse({ quantity: 0 });
    expect(error.success).toBe(false);
    if (error.success) return;

    expect(toOrderUserErrors(error.error, "ORDER_UPDATE_FAILED")).toEqual([
      expect.objectContaining({
        field: ["input", "quantity"],
        code: "ORDER_INPUT_INVALID",
        retryable: false,
      }),
    ]);
  });

  test("does not expose internal provider messages", () => {
    const [error] = toOrderUserErrors(
      new Error("database password=secret connection failed"),
      "ORDER_UPDATE_FAILED",
    );
    expect(error).toMatchObject({
      code: "ORDER_UPDATE_FAILED",
      message: "The order command could not be completed.",
    });
  });

  test("does not expose optimistic-lock metadata", () => {
    const [error] = toOrderUserErrors(new Error("stale client state"), "ORDER_UPDATE_FAILED");
    expect(error).toMatchObject({
      code: "ORDER_UPDATE_FAILED",
      retryable: false,
    });
  });
});
