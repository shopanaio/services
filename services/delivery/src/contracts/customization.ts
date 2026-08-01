import type { Delivery } from "@shopana/broker-types";

/** Executes deterministic commerce functions after normalization and before selection. */
export interface DeliveryCustomizationPort {
  customize(
    input: Delivery.DeliveryCustomizationFunctionInput,
    basedOnRateOptionsRevision: string,
  ): Promise<Delivery.DeliveryCustomizationResult>;
}

/** Validates function output against existing group/handle identities and policy. */
export interface DeliveryCustomizationPolicyPort {
  apply(input: Readonly<{
    policy: Delivery.DeliveryCustomizationPolicySnapshot;
    functionInput: Delivery.DeliveryCustomizationFunctionInput;
    results: readonly Readonly<{
      execution: Delivery.DeliveryCustomizationExecutionSnapshot;
      output: Delivery.DeliveryCustomizationFunctionResult | null;
    }>[];
    basedOnRateOptionsRevision: string;
  }>): Delivery.DeliveryCustomizationResult;
}
