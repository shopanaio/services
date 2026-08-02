import type {
  DeliveryCustomizationPort,
  DeliveryCustomerInputResolutionPort,
  DeliveryCustomerInputValidationPort,
  DeliveryEligibilityPort,
  DeliveryOptionBindingsPort,
  DeliveryProfileAssignmentsPort,
  DeliveryProfilesPort,
  DeliveryProviderAccountsPort,
  DeliveryProviderExecutionPolicyPort,
  DeliveryRateAggregationPort,
} from "../contracts/index.js";
import type {
  CalculateDeliveryOptionsParams,
  CalculateDeliveryOptionsResult,
  DeliveryCheckoutPlanningPort,
  DeliveryCheckoutFactsPort,
} from "./contracts.js";

export interface DeliveryCheckoutPipelinePorts {
  readonly profiles: DeliveryProfilesPort;
  readonly assignments: DeliveryProfileAssignmentsPort;
  readonly facts: DeliveryCheckoutFactsPort;
  readonly planning: DeliveryCheckoutPlanningPort;
  readonly eligibility: DeliveryEligibilityPort;
  readonly providerAccounts: DeliveryProviderAccountsPort;
  readonly executionPolicies: DeliveryProviderExecutionPolicyPort;
  readonly rates: DeliveryRateAggregationPort;
  readonly customization: DeliveryCustomizationPort;
  readonly bindings: DeliveryOptionBindingsPort;
  readonly customerInput: DeliveryCustomerInputValidationPort;
  readonly customerInputResolution: DeliveryCustomerInputResolutionPort;
}

/** Contract-only orchestration: assignment → facts → planning → eligibility → rates → customization → bindings. */
export interface DeliveryCheckoutPipeline {
  calculate(
    params: CalculateDeliveryOptionsParams,
  ): Promise<CalculateDeliveryOptionsResult>;
}
