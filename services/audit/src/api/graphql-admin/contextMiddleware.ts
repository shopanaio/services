import {
  buildAdminContextMiddleware as buildMiddleware,
  type AdminContextClaims,
  type ContextStore,
  type ContextUser,
} from "@shopana/shared-context";
import { Kernel } from "../../kernel/Kernel.js";

declare module "fastify" {
  interface FastifyRequest {
    store: ContextStore;
    user: ContextUser;
    adminContext?: AdminContextClaims;
  }
}

export function buildAdminContextMiddleware() {
  return buildMiddleware(Kernel.getInstance().getServices().broker, {
    serviceName: "AUDIT",
  });
}
