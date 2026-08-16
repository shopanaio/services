/**
 * Raised when TransactionalStep is invoked or wired outside of its supported
 * DBOS workflow transaction boundary.
 */
export class TransactionalStepConfigurationError extends Error {
  readonly code = "TRANSACTIONAL_STEP_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "TransactionalStepConfigurationError";
  }
}
