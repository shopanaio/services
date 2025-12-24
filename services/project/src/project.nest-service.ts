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
import {
  GetCurrentStoreScript,
  type GetCurrentStoreParams,
  type GetCurrentStoreResult,
  GetStoreByIdScript,
  type GetStoreByIdParams,
  type GetStoreByIdResult,
  GetResourcesScript,
  type GetResourcesParams,
  type GetResourcesResult,
} from "./scripts/index.js";

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

    this.broker.register<GetCurrentStoreParams, GetCurrentStoreResult>(
      "getCurrentStore",
      async (params) => {
        return this.kernel.runScript(GetCurrentStoreScript, params!);
      }
    );
    this.logger.debug("Action project.getCurrentStore registered");

    this.broker.register<GetStoreByIdParams, GetStoreByIdResult>(
      "getStoreById",
      async (params) => {
        return this.kernel.runScript(GetStoreByIdScript, params!);
      }
    );
    this.logger.debug("Action project.getStoreById registered");

    this.broker.register<GetResourcesParams, GetResourcesResult>(
      "getResources",
      async () => {
        return this.kernel.runScript(GetResourcesScript, undefined);
      }
    );
    this.logger.debug("Action project.getResources registered");

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
