import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";
import type { FastifyInstance } from "fastify";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "./api/graphql-admin/server.js";
import { StoreCreateWorkflow } from "./workflows/index.js";

const { service } = getServiceConfig("project");

@Injectable()
export class ProjectNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker('project') private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry
  ) {}

  async onModuleInit() {
    this.kernel = await Kernel.create(this.broker, this.workflow);

    this.workflow.register(
      "storeCreate",
      new StoreCreateWorkflow("storeCreate", { kernel: this.kernel })
    );
    this.logger.debug("Registered workflow: storeCreate");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });

    this.logger.log("Project service started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister("storeCreate");
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
