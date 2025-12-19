import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import {
  getServiceConfig,
  buildDatabaseUrl,
} from "@shopana/shared-service-config";
import { SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { Repository } from "./repositories/Repository.js";
import { ProjectCreateWorkflow } from "./workflows/index.js";

const { service } = getServiceConfig("project");

@Injectable()
export class ProjectNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectNestService.name);
  private graphqlServer: FastifyInstance | null = null;
  private repository: Repository | null = null;

  constructor(
    @Inject(SERVICE_BROKER) private readonly broker: ServiceBroker,
    @Optional() @Inject(WORKFLOW_REGISTRY) private readonly workflow?: WorkflowRegistry,
  ) {}

  async onModuleInit() {
    const databaseUrl = service.db ? buildDatabaseUrl(service.db) : "";

    // Initialize repository
    if (databaseUrl) {
      this.repository = await Repository.create({ databaseUrl });
    }

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      repository: databaseUrl ? { databaseUrl } : undefined,
    });

    // Register workflows (if WorkflowModule is available)
    if (this.workflow && this.repository) {
      this.workflow.register('projectCreate', new ProjectCreateWorkflow({
        broker: this.broker,
        logger: this.logger,
        repository: this.repository,
      }));
      this.logger.debug('Registered workflow: projectCreate');
    }

    this.logger.log("Project service started");
  }

  async onModuleDestroy() {
    // Deregister workflows
    if (this.workflow) {
      this.workflow.deregister('projectCreate');
    }

    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.repository) {
      await this.repository.close();
    }

    this.logger.log("Project service stopped");
  }
}
