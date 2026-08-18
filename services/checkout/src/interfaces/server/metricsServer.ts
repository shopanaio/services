import fastify from "fastify";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { checkoutMetricsRegistry } from "../../infrastructure/observability/checkoutObservability.js";
import { CheckoutPlacementRepository } from "../../infrastructure/mutations/CheckoutPlacementRepository.js";
import { checkoutReadiness } from "./readiness.js";

export async function startCheckoutMetricsServer(input: {
  port: number;
  broker: ServiceBroker;
  placements: CheckoutPlacementRepository;
}) {
  const app = fastify({ disableRequestLogging: true, logger: false });
  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "checkout-metrics" });
  });
  app.get("/readyz", async (_request, reply) => {
    const readiness = await checkoutReadiness(input.broker);
    return reply.status(readiness.ready ? 200 : 503).send(readiness);
  });
  app.get("/metrics", async (_request, reply) => {
    const [base, operational] = await Promise.all([
      checkoutMetricsRegistry.metrics(),
      input.placements.operationalMetrics(),
    ]);
    const gauges = [
      "# HELP shopana_checkout_stuck_placements Placements with no persisted progress for five minutes.",
      "# TYPE shopana_checkout_stuck_placements gauge",
      `shopana_checkout_stuck_placements ${operational.stuckPlacements}`,
      "# HELP shopana_checkout_payment_monitor_lag_seconds Age of the oldest placement waiting for payment monitoring.",
      "# TYPE shopana_checkout_payment_monitor_lag_seconds gauge",
      `shopana_checkout_payment_monitor_lag_seconds ${operational.paymentMonitorLagSeconds}`,
      "# HELP shopana_checkout_unresolved_compensation_failures Persisted exhausted compensation operations.",
      "# TYPE shopana_checkout_unresolved_compensation_failures gauge",
      `shopana_checkout_unresolved_compensation_failures ${operational.unresolvedCompensationFailures}`,
    ].join("\n");
    return reply
      .type(checkoutMetricsRegistry.contentType)
      .send(`${base}${gauges}\n`);
  });
  await app.listen({ port: input.port, host: "0.0.0.0" });
  return app;
}
