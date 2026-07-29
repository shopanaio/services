import type {
  CommerceFunctionExecutionTrace,
  FunctionErrorClass,
} from "./contracts.js";

export class FunctionTargetNotFoundError extends Error {
  readonly code = "FUNCTION_TARGET_NOT_FOUND";

  constructor(readonly target: string) {
    super(`Commerce Function target "${target}" is not registered`);
    this.name = "FunctionTargetNotFoundError";
  }
}

export class FunctionEnvelopeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FunctionEnvelopeError";
  }
}

export class CommerceFunctionExecutionError extends Error {
  readonly code = "COMMERCE_FUNCTION_EXECUTION_FAILED";

  constructor(
    message: string,
    readonly trace: CommerceFunctionExecutionTrace,
    readonly errorClass: FunctionErrorClass,
  ) {
    super(message);
    this.name = "CommerceFunctionExecutionError";
  }
}
