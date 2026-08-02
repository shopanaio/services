import {
  BrokerFunctionExecutor,
  CommerceFunctionExecutionError,
  CommerceFunctionRunner,
  FunctionRouteResolver,
  FunctionTargetRegistry,
  type CommerceFunctionBindingRef,
  type CommerceFunctionRunResult,
} from "@shopana/function-runner";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  pricingDeliveryDiscountFunctionOutputSchema,
  pricingLineDiscountFunctionOutputSchema,
  type PricingDeliveryDiscountFunctionInput,
  type PricingDeliveryDiscountFunctionOutput,
  type PricingLineDiscountFunctionInput,
  type PricingLineDiscountFunctionOutput,
  PricingDiscountFunctionTargets,
} from "../discount-function-contracts.js";
import { PricingCheckoutError } from "../errors.js";
import { PRICING_DISCOUNT_TARGETS } from "./targetDefinitions.js";

type FunctionRunRequest<TInput> = {
  storeId: string;
  bindings: readonly CommerceFunctionBindingRef[];
  bindingSetRevision: string;
  input: TInput;
  executionId: string;
  correlationId?: string;
  deadlineAt?: string;
};

export type ValidatedFunctionRun<TOutput> = CommerceFunctionRunResult<TOutput> & {
  readonly invalidFunctionBindingIds: readonly string[];
};

export class PricingDiscountFunctionRunner {
  private readonly runner: CommerceFunctionRunner;

  constructor(broker: ServiceBroker) {
    this.runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry(PRICING_DISCOUNT_TARGETS),
      new FunctionRouteResolver(broker),
      new BrokerFunctionExecutor(broker),
    );
  }

  async runLines(request: FunctionRunRequest<PricingLineDiscountFunctionInput>): Promise<ValidatedFunctionRun<PricingLineDiscountFunctionOutput>> {
    return this.runAndValidate(request, PricingDiscountFunctionTargets.lines, (value) => pricingLineDiscountFunctionOutputSchema.safeParse(value));
  }

  async runDelivery(request: FunctionRunRequest<PricingDeliveryDiscountFunctionInput>): Promise<ValidatedFunctionRun<PricingDeliveryDiscountFunctionOutput>> {
    return this.runAndValidate(request, PricingDiscountFunctionTargets.deliveryOptions, (value) => pricingDeliveryDiscountFunctionOutputSchema.safeParse(value));
  }

  private async runAndValidate<TInput, TOutput>(
    request: FunctionRunRequest<TInput>,
    target: string,
    validate: (value: unknown) => { success: true; data: TOutput } | { success: false },
  ): Promise<ValidatedFunctionRun<TOutput>> {
    let result: CommerceFunctionRunResult<unknown>;
    try {
      result = await this.runner.run<TInput, unknown>({ ...request, target });
    } catch (error) {
      if (error instanceof CommerceFunctionExecutionError) throw new PricingCheckoutError("PRICING_FUNCTION_REQUIRED_FAILURE", error.message, false);
      throw error;
    }
    const outputs: Array<CommerceFunctionRunResult<TOutput>["outputs"][number]> = [];
    const invalidFunctionBindingIds: string[] = [];
    for (const output of result.outputs) {
      const parsed = validate(output.data);
      if (parsed.success) {
        outputs.push({ ...output, data: parsed.data });
        continue;
      }
      const implementation = result.trace.implementations.find((row) => row.planIndex === output.planIndex);
      if (implementation?.failureMode === "REQUIRED") throw new PricingCheckoutError("PRICING_FUNCTION_OUTPUT_INVALID", `Required function ${output.implementationId} returned invalid output`, false);
      if (output.functionBindingId) invalidFunctionBindingIds.push(output.functionBindingId);
    }
    return { ...result, outputs, invalidFunctionBindingIds };
  }
}
