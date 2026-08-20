import {
  BrokerFunctionExecutor,
  CommerceFunctionExecutionError,
  CommerceFunctionRunner,
  FunctionRouteResolver,
  FunctionTargetRegistry,
  type CommerceFunctionBindingRef,
  type CommerceFunctionRunResult,
} from "@shopana/function-runner";
import {
  DELIVERY_CUSTOMIZATION_FUNCTION_TARGET,
  DELIVERY_CUSTOMIZATION_MAX_EXECUTIONS,
  DELIVERY_CUSTOMIZATION_MAX_OPERATIONS,
  type Delivery,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { DeliveryCustomizationFunctionResultSchema } from "../../contracts/customization-schemas.js";
import { revision } from "../../domain/canonical.js";

export const DELIVERY_CUSTOMIZATION_FUNCTION_TARGET_DEFINITION = {
  target: DELIVERY_CUSTOMIZATION_FUNCTION_TARGET,
  owningService: "delivery",
  executionMode: "COLLECT_ALL",
  nativeImplementations: [],
  defaultTimeoutMs: 3_000,
  concurrencyLimit: 8,
  appFailureMode: "REQUIRED",
  allowMultipleAppImplementations: true,
  maxInputBytes: 1_048_576,
  maxOutputBytes: 1_048_576,
  maxEnvelopeDepth: 32,
  tracePolicy: { inputDigest: true, outputDigest: true },
} as const;

export class DeliveryCustomizationRunner {
  private readonly runner: CommerceFunctionRunner;
  constructor(broker: ServiceBroker) {
    this.runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([DELIVERY_CUSTOMIZATION_FUNCTION_TARGET_DEFINITION]),
      new FunctionRouteResolver(broker),
      new BrokerFunctionExecutor(broker),
    );
  }

  async run(
    input: Delivery.DeliveryCustomizationFunctionInput,
    bindings: readonly CommerceFunctionBindingRef[],
    bindingSetRevision: string,
    deadlineAt: string,
  ): Promise<{
    groups: readonly Delivery.DeliveryCustomizationGroup[];
    hiddenHandles: readonly string[];
    issues: readonly Delivery.DeliveryCheckoutIssue[];
    revision: string;
  }> {
    if (bindings.length > DELIVERY_CUSTOMIZATION_MAX_EXECUTIONS)
      throw new Error("Too many delivery customization functions are active");
    let result: CommerceFunctionRunResult<unknown>;
    try {
      result = await this.runner.run({
        storeId: input.storeId,
        target: DELIVERY_CUSTOMIZATION_FUNCTION_TARGET,
        bindings,
        bindingSetRevision,
        input,
        executionId: input.executionId,
        correlationId: input.executionId,
        deadlineAt,
      });
    } catch (error) {
      if (error instanceof CommerceFunctionExecutionError)
        throw new Error("A required delivery customization function failed", { cause: error });
      throw error;
    }
    let groups: Delivery.DeliveryCustomizationGroup[] = input.groups.map((group) => ({
      ...group,
      options: [...group.options],
    }));
    const hidden = new Set<string>();
    const issues: Delivery.DeliveryCheckoutIssue[] = [];
    let count = 0;
    for (const output of result.outputs) {
      const trace = result.trace.implementations.find(
        (item) => item.planIndex === output.planIndex,
      );
      const parsed = DeliveryCustomizationFunctionResultSchema.safeParse(output.data);
      if (!parsed.success) {
        if (trace?.failureMode === "REQUIRED")
          throw new Error("A required delivery customization returned invalid output");
        issues.push({
          severity: "WARNING",
          code: "DELIVERY_CUSTOMIZATION_OUTPUT_INVALID",
          message: "An optional delivery customization returned invalid output.",
          groupId: null,
          carrierServiceAccountId: null,
          retryable: false,
        });
        continue;
      }
      count += parsed.data.operations.length;
      if (count > DELIVERY_CUSTOMIZATION_MAX_OPERATIONS)
        throw new Error("Delivery customization operation limit exceeded");
      const before = groups;
      const hiddenBefore = new Set(hidden);
      try {
        groups = apply(groups, parsed.data.operations, hidden);
      } catch (error) {
        groups = before;
        hidden.clear();
        for (const handle of hiddenBefore) hidden.add(handle);
        if (trace?.failureMode === "REQUIRED") throw error;
        issues.push({
          severity: "WARNING",
          code: "DELIVERY_CUSTOMIZATION_OUTPUT_INVALID",
          message: "An optional delivery customization referenced an invalid option.",
          groupId: null,
          carrierServiceAccountId: null,
          retryable: false,
        });
      }
    }
    if (
      input.groups.some(
        (before) =>
          before.options.length > 0 &&
          groups.find((after) => after.groupId === before.groupId)?.options.length === 0,
      )
    )
      throw new Error("Delivery customization may not hide every option in a group");
    return {
      groups,
      hiddenHandles: [...hidden].sort(),
      issues,
      revision: revision("dcust_v1", {
        bindingSetRevision,
        implementations: result.trace.implementations.map((trace) => ({
          binding: trace.functionBindingId,
          status: trace.status,
          output: trace.outputDigest ?? null,
        })),
        groups: groups.map((group) => ({ groupId: group.groupId, options: group.options })),
      }),
    };
  }
}

function apply(
  groups: Array<Delivery.DeliveryCustomizationGroup>,
  operations: readonly Delivery.DeliveryCustomizationOperation[],
  hidden: Set<string>,
): Array<Delivery.DeliveryCustomizationGroup> {
  let result = groups.map((group) => ({ ...group, options: [...group.options] }));
  for (const operation of operations) {
    const groupIndex = result.findIndex((group) => group.groupId === operation.groupId);
    if (groupIndex < 0) throw new Error("Unknown delivery group");
    const group = result[groupIndex]!;
    const options = [...group.options];
    const optionIndex = options.findIndex((option) => option.handle === operation.optionHandle);
    if (optionIndex < 0) throw new Error("Unknown delivery option");
    if (operation.type === "HIDE") {
      hidden.add(operation.optionHandle);
      options.splice(optionIndex, 1);
    } else if (operation.type === "RENAME")
      options[optionIndex] = { ...options[optionIndex]!, title: operation.title };
    else {
      const [option] = options.splice(optionIndex, 1);
      if (operation.index > options.length)
        throw new Error("Delivery option move index is out of range");
      options.splice(operation.index, 0, option!);
    }
    result[groupIndex] = { ...group, options };
  }
  return result;
}
