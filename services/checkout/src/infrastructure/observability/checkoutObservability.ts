import { metrics, trace } from "@opentelemetry/api";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const checkoutTracer = trace.getTracer("shopana-checkout");
export const checkoutMeter = metrics.getMeter("shopana-checkout");

export const checkoutMetricsRegistry = new Registry();
collectDefaultMetrics({ register: checkoutMetricsRegistry, prefix: "shopana_checkout_" });

export const mutationLatency = new Histogram({
  name: "shopana_checkout_mutation_duration_seconds",
  help: "Storefront checkout mutation latency.",
  labelNames: ["operation", "outcome"] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [checkoutMetricsRegistry],
});

export const pipelineStageLatency = new Histogram({
  name: "shopana_checkout_pipeline_stage_duration_seconds",
  help: "Checkout pipeline stage latency.",
  labelNames: ["stage", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [checkoutMetricsRegistry],
});

export const casConflicts = new Counter({
  name: "shopana_checkout_cas_conflicts_total",
  help: "Checkout compare-and-swap commit conflicts.",
  registers: [checkoutMetricsRegistry],
});

export const compensationFailures = new Counter({
  name: "shopana_checkout_compensation_failures_total",
  help: "Checkout placement compensations that exhausted workflow-step retries.",
  labelNames: ["operation"] as const,
  registers: [checkoutMetricsRegistry],
});
