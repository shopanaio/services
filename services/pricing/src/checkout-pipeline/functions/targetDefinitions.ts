import type { FunctionTargetDefinition } from "@shopana/function-runner";
import { PricingDiscountFunctionTargets } from "../discount-function-contracts.js";

const shared = { owningService: "pricing", executionMode: "COLLECT_ALL", nativeImplementations: [], defaultTimeoutMs: 3_000, concurrencyLimit: 8, appFailureMode: "OPTIONAL", allowMultipleAppImplementations: true, maxInputBytes: 1_048_576, maxOutputBytes: 1_048_576, maxEnvelopeDepth: 32, tracePolicy: { inputDigest: true, outputDigest: true } } as const;
export const PRICING_LINE_DISCOUNT_TARGET: FunctionTargetDefinition = { target: PricingDiscountFunctionTargets.lines, ...shared };
export const PRICING_DELIVERY_DISCOUNT_TARGET: FunctionTargetDefinition = { target: PricingDiscountFunctionTargets.deliveryOptions, ...shared };
export const PRICING_DISCOUNT_TARGETS = [PRICING_LINE_DISCOUNT_TARGET, PRICING_DELIVERY_DISCOUNT_TARGET] as const;
