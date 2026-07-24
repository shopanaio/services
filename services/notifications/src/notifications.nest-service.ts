import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { FastifyInstance } from "fastify";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  WORKFLOW_REGISTRY,
  WorkflowRegistry,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import { startServer } from "./api/graphql-admin/server.js";
import { startMetricsServer } from "./api/metrics/server.js";
import { Kernel } from "./kernel/Kernel.js";

const { global, service } = getServiceConfig("notifications");

@Injectable()
export class NotificationsNestService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationsNestService.name);
  private kernel!: Kernel;
  private server: FastifyInstance | null = null;
  private metricsServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("notifications") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit(): Promise<void> {
    const masterKey =
      process.env.NOTIFICATIONS_DATA_PROTECTION_KEY ??
      (global.environment === "production"
        ? ""
        : "shopana-development-notifications-data-protection-key");
    if (!masterKey) {
      throw new Error(
        "NOTIFICATIONS_DATA_PROTECTION_KEY is required in production"
      );
    }
    this.kernel = Kernel.create(
      this.broker,
      this.workflow,
      this.dbClient,
      masterKey
    );
    this.server = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.metricsServer = await startMetricsServer({
      port: service.ports?.metrics ?? 0,
      database: this.kernel.db,
    });
    this.logger.log("Notifications service started");
  }

  async onModuleDestroy(): Promise<void> {
    if (this.server) await this.server.close();
    if (this.metricsServer) await this.metricsServer.close();
    if (this.kernel) await this.kernel.close();
    this.logger.log("Notifications service stopped");
  }
}
