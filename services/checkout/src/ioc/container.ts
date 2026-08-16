import { CheckoutUsecase } from "@src/application/checkout/checkoutUsecase";
import { createLogger } from "@src/infrastructure/logger/pino";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  BrokerFunctionExecutor,
  CommerceFunctionRunner,
  FunctionRouteResolver,
  FunctionTargetRegistry,
} from "@shopana/function-runner";
import {
  CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION,
  CheckoutPipeline,
  CheckoutValidationRunner,
} from "@src/application/pipeline/index.js";
import {
  BrokerCheckoutValidationBindingSource,
  BrokerCustomersCheckoutEligibilityAdapter,
  BrokerDeliveryCheckoutAdapter,
  BrokerPaymentsCheckoutAdapter,
  BrokerPricingCheckoutAdapter,
  BrokerLoyaltyCheckoutAdapter,
} from "@src/infrastructure/pipeline/index.js";
import {
  CheckoutCreateIdempotencyRepository,
  CheckoutMutationRepository,
} from "@src/infrastructure/mutations/index.js";
import {
  CheckoutMutationCoordinator,
  CheckoutRecalculationRequestFactory,
} from "@src/application/mutations/index.js";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;

  public broker!: ServiceBroker;
  public checkoutMutationRepository!: CheckoutMutationRepository;
  public checkoutCreateIdempotencyRepository!: CheckoutCreateIdempotencyRepository;
  public checkoutPipeline!: CheckoutPipeline;
  public checkoutMutationCoordinator!: CheckoutMutationCoordinator;
  public checkoutUsecase!: CheckoutUsecase;

  private constructor() {}

  /**
   * Create and initialize App instance with broker
   */
  public static create(broker: ServiceBroker): App {
    const app = new App();

    // Initialize basic dependencies
    app.logger = createLogger();
    app.broker = broker;

    // Initialize infrastructure dependencies
    app.checkoutMutationRepository = new CheckoutMutationRepository();
    app.checkoutCreateIdempotencyRepository =
      new CheckoutCreateIdempotencyRepository();
    const functionRunner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([
        CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION,
      ]),
      new FunctionRouteResolver(broker),
      new BrokerFunctionExecutor(broker),
    );
    const validationRunner = new CheckoutValidationRunner({
      functions: functionRunner,
      bindings: new BrokerCheckoutValidationBindingSource(broker),
    });
    app.checkoutPipeline = new CheckoutPipeline({
      pricing: new BrokerPricingCheckoutAdapter(broker),
      delivery: new BrokerDeliveryCheckoutAdapter(broker),
      payments: new BrokerPaymentsCheckoutAdapter(broker),
      loyalty: new BrokerLoyaltyCheckoutAdapter(broker),
      validationRunner,
    });
    app.checkoutMutationCoordinator = new CheckoutMutationCoordinator({
      snapshots: app.checkoutMutationRepository,
      commits: app.checkoutMutationRepository,
      requests: new CheckoutRecalculationRequestFactory(
        new BrokerCustomersCheckoutEligibilityAdapter(broker),
      ),
      pipeline: app.checkoutPipeline,
      idempotency: app.checkoutCreateIdempotencyRepository,
    });
    app.checkoutUsecase = new CheckoutUsecase({
      logger: app.logger,
      checkoutMutationSnapshots: app.checkoutMutationRepository,
      checkoutMutationCoordinator: app.checkoutMutationCoordinator,
    });

    this.instance = app;
    return app;
  }

  public static getInstance(): App {
    if (this.instance === null) {
      this.instance = new App();
    }
    return this.instance;
  }
}
