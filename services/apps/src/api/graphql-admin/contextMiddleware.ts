import {
  buildAdminContextMiddleware as buildMiddleware,
  type ContextStore,
  type ContextUser,
} from "@shopana/shared-context";
import type { ServiceBroker } from "@shopana/shared-kernel";

declare module "fastify" {
  interface FastifyRequest {
    store: ContextStore;
    user: ContextUser;
  }
}

export function buildAdminContextMiddleware(broker: ServiceBroker) {
  return buildMiddleware(broker, {
    serviceName: "APPS",
  });
}
