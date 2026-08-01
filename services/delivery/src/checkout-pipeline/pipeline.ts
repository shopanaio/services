import type {
  DeliveryCustomizationPort,
  DeliveryEligibilityPort,
  DeliveryOptionBindingsPort,
  DeliveryRateAggregationPort,
} from "../contracts/index.js";
import type {
  CalculateDeliveryOptionsParams,
  CalculateDeliveryOptionsResult,
  DeliveryCheckoutPlanningPort,
} from "./contracts.js";

export interface DeliveryCheckoutPipelinePorts {
  readonly planning: DeliveryCheckoutPlanningPort;
  readonly eligibility: DeliveryEligibilityPort;
  readonly rates: DeliveryRateAggregationPort;
  readonly customization: DeliveryCustomizationPort;
  readonly bindings: DeliveryOptionBindingsPort;
}

/** Contract-only orchestration: plan → eligibility → rates → customization → bindings. */
export interface DeliveryCheckoutPipeline {
  calculate(
    params: CalculateDeliveryOptionsParams,
  ): Promise<CalculateDeliveryOptionsResult>;
}
