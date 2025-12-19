import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";
import type { FastifyInstance } from "fastify";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "./api/graphql-admin/server.js";
import { ProjectCreateWorkflow } from "./workflows/index.js";

const { service } = getServiceConfig("project");

@Injectable()
export class ProjectNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @Inject(SERVICE_BROKER) private readonly broker: ServiceBroker,
    @Optional()
    @Inject(WORKFLOW_REGISTRY)
    private readonly workflowRegistry: WorkflowRegistry
  ) {}

  async onModuleInit() {
    this.kernel = await Kernel.create(this.broker);

    if (this.workflowRegistry) {
      this.workflowRegistry.register(
        "projectCreate",
        new ProjectCreateWorkflow({ kernel: this.kernel })
      );
      this.logger.debug("Registered workflow: projectCreate");
    }

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });

    this.logger.log("Project service started");
  }

  async onModuleDestroy() {
    if (this.workflowRegistry) {
      this.workflowRegistry.deregister("projectCreate");
    }

    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Project service stopped");
  }
}
