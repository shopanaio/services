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
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "@src/api/graphql-admin/server.js";
import { getServiceConfig } from "@shopana/shared-service-config";
import {
  OrganizationCreateWorkflow,
  OrganizationDeleteWorkflow,
} from "./workflows/index.js";

const { service } = getServiceConfig("iam");

@Injectable()
export class IamNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("iam") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("IAM onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    // Register workflows
    const organizationCreateWorkflow = new OrganizationCreateWorkflow(
      "organizationCreate",
      { kernel: this.kernel }
    );
    const organizationCreateWorkflowName =
      this.broker.qualifyAction("organizationCreate");
    this.workflow.register(organizationCreateWorkflowName, {
      instance: organizationCreateWorkflow,
      metadata: { name: "organizationCreate" },
    });

    const organizationDeleteWorkflow = new OrganizationDeleteWorkflow(
      "organizationDelete",
      { kernel: this.kernel }
    );
    const organizationDeleteWorkflowName =
      this.broker.qualifyAction("organizationDelete");
    this.workflow.register(organizationDeleteWorkflowName, {
      instance: organizationDeleteWorkflow,
      metadata: { name: "organizationDelete" },
    });

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister(this.broker.qualifyAction("organizationCreate"));
      this.workflow.deregister(this.broker.qualifyAction("organizationDelete"));
    }

    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("IAM service stopped");
  }
}
