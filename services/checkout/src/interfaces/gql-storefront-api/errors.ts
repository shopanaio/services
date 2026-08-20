import type { ValidationError } from "class-validator";
import { CheckoutMutationError } from "@src/application/mutations/contracts.js";
import type { ApiCheckoutUserError } from "./types.js";

/**
 * GraphQL error helpers for consistent error responses.
 * Returned errors include extensions.code and structured details where applicable.
 */
export async function badUserInput(message: string, details?: unknown) {
  const { GraphQLError } = await import("graphql");
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT", details },
  } as any);
}

export async function fromValidationErrors(errors: ValidationError[]) {
  const flat = errors.map((e) => ({
    field: e.property,
    messages: Object.values(e.constraints ?? {}),
    children: e.children?.length ? e.children : undefined,
  }));
  return badUserInput("Invalid input", { validation: flat });
}

export async function fromDomainError(err: unknown) {
  const { GraphQLError } = await import("graphql");
  if (err instanceof CheckoutMutationError) {
    return new GraphQLError(err.message, {
      extensions: { code: err.code, retryable: err.retryable },
    });
  }
  return new GraphQLError("Checkout mutation failed.", {
    extensions: { code: "INTERNAL_SERVER_ERROR", retryable: true },
  });
}

export function checkoutUserErrorFrom(
  error: unknown,
  field: readonly string[] = [],
): ApiCheckoutUserError | null {
  if (error instanceof CheckoutMutationError) {
    return userError(error.code, error.message, error.retryable, field);
  }
  if (error instanceof Error && error.message.startsWith("Validation failed:")) {
    return userError("BAD_USER_INPUT", "Checkout input is invalid.", false, field);
  }
  if (error && typeof error === "object" && "extensions" in error) {
    const extensions = error.extensions;
    if (extensions && typeof extensions === "object" && "code" in extensions) {
      const code = typeof extensions.code === "string" ? extensions.code : null;
      if (code && code !== "INTERNAL_SERVER_ERROR") {
        const message =
          "message" in error && typeof error.message === "string"
            ? error.message
            : "Checkout request was rejected.";
        const retryable = "retryable" in extensions && extensions.retryable === true;
        return userError(code, message, retryable, field);
      }
    }
  }
  return null;
}

function userError(
  code: string,
  message: string,
  retryable: boolean,
  field: readonly string[],
): ApiCheckoutUserError {
  return {
    __typename: "CheckoutUserError",
    code,
    message,
    retryable,
    field: [...field],
  };
}
