import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server";
import { startStorefrontServer } from "./api/graphql-storefront/server.js";
import { Kernel } from "./kernel/Kernel";

const { service } = getServiceConfig("catalog");

@Injectable()
export class CatalogNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogNestService.name);
  private graphqlServer: FastifyInstance | null = null;
  private storefrontGraphqlServer: FastifyInstance | null = null;

  constructor(private readonly kernel: Kernel) {}

  async onModuleInit() {
    this.logger.debug("Catalog onModuleInit started");

    this.logger.debug("Kernel injected");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.storefrontGraphqlServer = await startStorefrontServer({
      port: service.ports?.storefront_graphql ?? 0,
    });
    this.logger.debug("Storefront GraphQL server started");

    this.logger.log("Catalog service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.storefrontGraphqlServer) {
      await this.storefrontGraphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Catalog service stopped");
  }
}
