import type { Logger } from "pino";
import type { CheckoutContext } from "@src/context/index.js";
import type { CheckoutMutationCoordinator } from "@src/application/mutations/index.js";

export interface UseCaseDependencies {
  logger?: Logger;
  checkoutMutationCoordinator: CheckoutMutationCoordinator;
}

export abstract class UseCase<TInput = unknown, TOutput = unknown> {
  protected readonly logger: Pick<Logger, "info" | "warn" | "error" | "debug">;
  protected readonly checkoutMutationCoordinator: CheckoutMutationCoordinator;

  constructor(dependencies: UseCaseDependencies) {
    this.logger = dependencies.logger ?? console;
    this.checkoutMutationCoordinator = dependencies.checkoutMutationCoordinator;
  }

  abstract execute(input: TInput): Promise<TOutput>;

  protected mutationContext(context: CheckoutContext) {
    return {
      storeId: context.store.id,
      visitorId: context.visitorId,
      storefrontAccess: {
        connectionId: context.storefrontAccess.connectionId,
        installationId: context.storefrontAccess.installationId,
        credentialId: context.storefrontAccess.credentialId,
        accessMode: context.storefrontAccess.accessMode,
      },
    } as const;
  }
}
