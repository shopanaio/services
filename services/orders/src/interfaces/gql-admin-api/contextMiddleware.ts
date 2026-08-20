import { buildAdminContextMiddleware as buildMiddleware } from "@shopana/shared-context";
import type { ServiceBroker } from "@shopana/shared-kernel";

export function buildAdminContextMiddleware(broker: ServiceBroker) {
  return buildMiddleware(broker, { serviceName: "ORDERS" });
}
