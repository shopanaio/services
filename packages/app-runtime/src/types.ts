import type { ShopanaAppDefinition } from "@shopana/app-sdk";
import type { FastifyInstance } from "fastify";

export type AppGraphQLSurface = "admin" | "storefront";

export interface HostedAppDefinition {
  readonly definition: ShopanaAppDefinition;
  /**
   * URL of the built App entry module. GraphQL schema assets are resolved
   * relative to this URL.
   */
  readonly moduleUrl: string;
}

export interface AppSubgraphRuntime {
  readonly appCode: string;
  readonly surface: AppGraphQLSurface;
  readonly origin: string;
  readonly server: FastifyInstance;
}

export interface AppsGraphQLIngressPorts {
  readonly admin?: number;
  readonly storefront?: number;
}
