import { CheckoutMutationError } from "../../application/mutations/contracts.js";
import { checkoutUserErrorFrom } from "./errors.js";

describe("checkout GraphQL user errors", () => {
  it("maps business errors into the SDL payload shape", () => {
    expect(
      checkoutUserErrorFrom(
        new CheckoutMutationError("CHECKOUT_VERSION_CONFLICT", "Retry the mutation.", true),
        ["input"],
      ),
    ).toEqual({
      __typename: "CheckoutUserError",
      code: "CHECKOUT_VERSION_CONFLICT",
      message: "Retry the mutation.",
      retryable: true,
      field: ["input"],
    });
  });

  it("does not convert unknown system failures into public business errors", () => {
    expect(checkoutUserErrorFrom(new Error("database password leaked"))).toBeNull();
  });
});
