import {
  BrokerFunctionExecutor,
  CommerceFunctionExecutionError,
  CommerceFunctionRunner,
  FunctionRouteResolver,
  FunctionTargetRegistry,
  type CommerceFunctionBindingRef,
  type CommerceFunctionRunResult,
  type FunctionImplementationTrace,
} from "@shopana/function-runner";
import {
  PAYMENT_CUSTOMIZATION_MAX_EXECUTIONS,
  PAYMENT_CUSTOMIZATION_MAX_OPERATIONS,
  PAYMENT_METHOD_CUSTOMIZATION_FUNCTION_TARGET,
  type Payments,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { paymentCustomizationResultSchema } from "../checkout-pipeline/schemas.js";
import { PaymentsCheckoutError } from "../checkout-pipeline/errors.js";
import { contentRevision } from "../checkout-pipeline/canonicalJson.js";

export interface PaymentCustomizationRunResult {
  methods: readonly Payments.PaymentsCheckoutMethod[];
  hiddenHandles: readonly string[];
  issues: readonly Payments.PaymentsCheckoutIssue[];
  executionRevision: string;
  executions: readonly Readonly<{ kind: "FUNCTION"; ownerId: string; status: string; classification: string | null; revision: string | null; audit: Record<string, unknown> }>[];
}

export class PaymentMethodCustomizationRunner {
  private readonly runner: CommerceFunctionRunner;
  constructor(broker: ServiceBroker) {
    this.runner = new CommerceFunctionRunner(new FunctionTargetRegistry([{
      target: PAYMENT_METHOD_CUSTOMIZATION_FUNCTION_TARGET, owningService: "payments", executionMode: "COLLECT_ALL", nativeImplementations: [], defaultTimeoutMs: 3_000, concurrencyLimit: 8,
      appFailureMode: "OPTIONAL", allowMultipleAppImplementations: true, maxInputBytes: 1_048_576, maxOutputBytes: 1_048_576, maxEnvelopeDepth: 32, tracePolicy: { inputDigest: true, outputDigest: true },
    }]), new FunctionRouteResolver(broker), new BrokerFunctionExecutor(broker));
  }

  async run(input: Payments.PaymentMethodCustomizationFunctionInput, bindings: readonly CommerceFunctionBindingRef[], bindingSetRevision: string, deadlineAt: string): Promise<PaymentCustomizationRunResult> {
    if (bindings.length > PAYMENT_CUSTOMIZATION_MAX_EXECUTIONS) throw new PaymentsCheckoutError("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "Too many payment customization functions are active.", false);
    let result: CommerceFunctionRunResult<unknown>;
    try {
      result = await this.runner.run<Payments.PaymentMethodCustomizationFunctionInput, unknown>({ storeId: input.storeId, target: PAYMENT_METHOD_CUSTOMIZATION_FUNCTION_TARGET, bindings, bindingSetRevision, input, executionId: input.executionId, deadlineAt });
    } catch (error) {
      if (error instanceof CommerceFunctionExecutionError) throw new PaymentsCheckoutError("PAYMENT_CUSTOMIZATION_FAILED", "A required payment customization function failed.", false, { cause: error });
      throw error;
    }
    let methods = [...input.methods];
    const hidden = new Set<string>();
    const invalidBindings = new Set<string>();
    const issues: Payments.PaymentsCheckoutIssue[] = [];
    let operationCount = 0;
    for (const output of result.outputs) {
      const trace = result.trace.implementations.find((item) => item.planIndex === output.planIndex);
      const parsed = paymentCustomizationResultSchema.safeParse(output.data);
      if (!parsed.success) {
        if (trace?.failureMode === "REQUIRED") throw new PaymentsCheckoutError("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "A required payment customization function returned invalid output.", false);
        if (output.functionBindingId) invalidBindings.add(output.functionBindingId);
        issues.push(issue("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "An optional payment customization returned invalid output.", output.functionBindingId));
        continue;
      }
      operationCount += parsed.data.operations.length;
      if (operationCount > PAYMENT_CUSTOMIZATION_MAX_OPERATIONS) throw new PaymentsCheckoutError("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "Payment customization operation limit exceeded.", false);
      const before = methods;
      const hiddenBefore = new Set(hidden);
      try { methods = applyPaymentMethodCustomizationOperations(methods, parsed.data.operations, hidden); }
      catch (error) {
        methods = before;
        hidden.clear();
        for (const handle of hiddenBefore) hidden.add(handle);
        if (trace?.failureMode === "REQUIRED") throw new PaymentsCheckoutError("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "A required payment customization referenced an invalid method.", false, { cause: error });
        if (output.functionBindingId) invalidBindings.add(output.functionBindingId);
        issues.push(issue("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "An optional payment customization referenced an invalid method.", output.functionBindingId));
      }
    }
    for (const trace of result.trace.implementations) {
      if (trace.status === "FAILED" || trace.status === "TIMED_OUT") issues.push(issue(trace.status === "TIMED_OUT" ? "PAYMENT_CUSTOMIZATION_DEADLINE_EXCEEDED" : "PAYMENT_CUSTOMIZATION_FAILED", "An optional payment customization function was skipped.", trace.functionBindingId));
    }
    if (input.methods.length > 0 && methods.length === 0) throw new PaymentsCheckoutError("PAYMENT_CUSTOMIZATION_OUTPUT_INVALID", "Payment customization may not hide all methods.", false);
    const executions = result.trace.implementations.map((trace) => execution(trace, invalidBindings));
    return { methods, hiddenHandles: [...hidden].sort(), issues, executionRevision: contentRevision("payment-function-executions", {
      bindingSetRevision: result.trace.bindingSetRevision,
      implementations: result.trace.implementations.map((trace) => ({ planIndex: trace.planIndex, functionBindingId: trace.functionBindingId, status: trace.status, failureMode: trace.failureMode, errorClass: trace.errorClass ?? null, errorCode: trace.errorCode ?? null, routeRevision: trace.routeRevision ?? trace.plannedRouteRevision ?? null, outputDigest: trace.outputDigest ?? null })),
      outputs: result.outputs.map((output) => ({ planIndex: output.planIndex, functionBindingId: output.functionBindingId, data: output.data })),
    }), executions };
  }
}

export function applyPaymentMethodCustomizationOperations(methods: Payments.PaymentsCheckoutMethod[], operations: readonly Payments.PaymentMethodCustomizationOperation[], hidden: Set<string>): Payments.PaymentsCheckoutMethod[] {
  let result = [...methods];
  for (const operation of operations) {
    const index = result.findIndex((method) => method.handle === operation.methodHandle);
    if (index < 0) throw new Error("Unknown payment method handle");
    if (operation.type === "HIDE") { hidden.add(operation.methodHandle); result.splice(index, 1); }
    else if (operation.type === "RENAME") result[index] = { ...result[index]!, title: operation.title };
    else { const [method] = result.splice(index, 1); if (operation.index > result.length) throw new Error("Payment method move index is out of range"); result.splice(operation.index, 0, method!); }
  }
  return result;
}
function issue(code: string, message: string, _functionBindingId: string | null): Payments.PaymentsCheckoutIssue { return { code, message, severity: "WARNING", retryable: false }; }
function execution(trace: FunctionImplementationTrace, invalidBindings: ReadonlySet<string>) { const invalid = trace.functionBindingId !== null && invalidBindings.has(trace.functionBindingId); return { kind: "FUNCTION" as const, ownerId: trace.functionBindingId ?? trace.implementationId, status: invalid ? "FAILED" : trace.status, classification: invalid ? "INVALID_OUTPUT" : trace.errorClass ?? null, revision: invalid ? null : trace.outputDigest ?? null, audit: { functionBindingId: trace.functionBindingId, capabilityRouteId: trace.capabilityRouteId ?? trace.plannedCapabilityRouteId ?? null, appCode: trace.appCode ?? trace.plannedAppCode ?? null, appVersion: trace.appVersion ?? trace.plannedAppVersion ?? null, configurationRevision: trace.configurationRevision, routeRevision: trace.routeRevision ?? trace.plannedRouteRevision ?? null, errorCode: invalid ? "PAYMENT_CUSTOMIZATION_OUTPUT_INVALID" : trace.errorCode ?? null } }; }
