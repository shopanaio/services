import type { Apps } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  CHECKOUT_VALIDATION_FUNCTION_TARGET,
  type CheckoutValidationBindingSource,
} from "../../application/pipeline/contracts/validationFunction.js";

export class BrokerCheckoutValidationBindingSource
  implements CheckoutValidationBindingSource
{
  constructor(private readonly broker: ServiceBroker) {}

  async loadForTarget(input: {
    storeId: string;
    target: typeof CHECKOUT_VALIDATION_FUNCTION_TARGET;
  }): Promise<readonly unknown[]> {
    const result = await this.broker.call<
      Apps.ListCommerceFunctionBindingsResult,
      Apps.ListCommerceFunctionBindingsParams
    >("apps.listCommerceFunctionBindings", {
      storeId: input.storeId,
      target: input.target,
    });
    return result.bindings;
  }
}
