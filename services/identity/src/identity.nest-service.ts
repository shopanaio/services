import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import {
  PROJECT_CREATED_ROUTING_KEY,
  PROJECT_READY_ROUTING_KEY_PREFIX,
  type ProjectCreatedPayload,
} from "@shopana/shared-service-events";
import type { FastifyInstance } from "fastify";
import { CasdoorAdapter } from "./adapters/casdoor/CasdoorAdapter.js";
import { startServer } from "./api/graphql-admin/server.js";

const { service } = getServiceConfig("identity");

@Injectable()
export class IdentityNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityNestService.name);
  private casdoorAdapter: CasdoorAdapter | null = null;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @Inject(SERVICE_BROKER) private readonly broker: ServiceBroker
  ) {}

  async onModuleInit() {
    const casdoor = service.casdoor;

    if (casdoor) {
      this.casdoorAdapter = await CasdoorAdapter.create({
        endpoint: casdoor.endpoint,
        clientId: casdoor.client_id,
        clientSecret: casdoor.client_secret,
        certificate: casdoor.certificate,
        organizationName: casdoor.organization_name,
        applicationName: casdoor.application_name,
      });
      this.logger.log("Casdoor adapter initialized");
    } else {
      this.logger.warn("No Casdoor config, running without identity provider");
    }

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      casdoorAdapter: this.casdoorAdapter,
    });

    this.logger.log("Identity service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    this.logger.log("Identity service stopped");
  }

  @RabbitSubscribe({
    exchange: "shopana.events",
    routingKey: PROJECT_CREATED_ROUTING_KEY,
    queue: "shopana.events.identity.project-created",
    queueOptions: {
      durable: true,
      deadLetterExchange: "shopana.dlx",
      deadLetterRoutingKey: "events.project.created.identity",
    },
  })
  async handleProjectCreated(payload: ProjectCreatedPayload): Promise<void> {
    const { projectId, name, ownerId } = payload;

    this.logger.log(
      `Received project.created event: projectId=${projectId}, name=${name}`
    );

    if (!this.casdoorAdapter) {
      this.logger.error("Casdoor adapter not initialized");
      await this.emitReadyEvent(projectId, "failed", "Casdoor not configured");
      return;
    }

    try {
      // 1. Create organization in Casdoor
      const casdoorOrgName = `project-${projectId}`;

      const orgResult = await this.casdoorAdapter.createOrganization({
        name: casdoorOrgName,
        displayName: name,
      });

      if (!orgResult.success) {
        this.logger.error(
          `Failed to create organization for project ${projectId}: ${orgResult.error}`
        );
        await this.emitReadyEvent(projectId, "failed", orgResult.error);
        return;
      }

      this.logger.log(
        `Organization ${casdoorOrgName} created for project ${projectId}`
      );

      // TODO: Add owner as member with "owner" role
      // This requires the membership service/repository to be implemented

      // 2. Emit project.ready.identity event
      await this.emitReadyEvent(projectId, "ready");

      this.logger.log(`Project ${projectId} identity initialization complete`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to initialize identity for project ${projectId}: ${errorMessage}`
      );
      await this.emitReadyEvent(projectId, "failed", errorMessage);
    }
  }

  private async emitReadyEvent(
    projectId: string,
    status: "ready" | "failed",
    error?: string
  ): Promise<void> {
    await this.broker.emit(`${PROJECT_READY_ROUTING_KEY_PREFIX}.identity`, {
      projectId,
      service: "identity",
      status,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
