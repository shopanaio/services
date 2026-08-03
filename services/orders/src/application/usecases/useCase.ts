import type { Logger } from "pino";

export interface UseCaseDependencies {
  logger?: Logger;
}

export abstract class UseCase<TInput = unknown, TOutput = unknown> {
  protected readonly logger: Pick<Logger, "info" | "warn" | "error" | "debug">;

  constructor(deps: UseCaseDependencies = {}) {
    this.logger = deps.logger ?? console;
  }

  abstract execute(input: TInput): Promise<TOutput>;
}
