import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  getServiceConfig,
  buildDatabaseUrl,
} from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";

const { service } = getServiceConfig("project");

@Injectable()
export class ProjectNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectNestService.name);
  private graphqlServer: FastifyInstance | null = null;

  async onModuleInit() {
    const databaseUrl = service.db ? buildDatabaseUrl(service.db) : "";

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      repository: databaseUrl ? { databaseUrl } : undefined,
    });

    this.logger.log("Project service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    this.logger.log("Project service stopped");
  }
}
