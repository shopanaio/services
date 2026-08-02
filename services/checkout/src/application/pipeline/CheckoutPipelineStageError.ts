const IDENTIFIER = /^[A-Z][A-Z0-9_]{0,127}$/;

export class CheckoutPipelineStageError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(input: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
    readonly cause?: unknown;
  }) {
    if (!IDENTIFIER.test(input.code)) {
      throw new TypeError("Checkout pipeline error code is invalid");
    }
    if (
      typeof input.message !== "string" ||
      input.message.trim().length === 0 ||
      input.message.length > 512
    ) {
      throw new TypeError("Checkout pipeline public error message is invalid");
    }
    if (typeof input.retryable !== "boolean") {
      throw new TypeError("Checkout pipeline retryable flag is invalid");
    }
    super(input.message, { cause: input.cause });
    this.name = "CheckoutPipelineStageError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.cause = input.cause;
  }
}
