import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
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
import { Kernel } from "./kernel/Kernel.js";

const { service } = getServiceConfig("audit");

@Injectable()
export class AuditNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditNestService.name);
  private kernel!: Kernel;
  private server: FastifyInstance | null = null;

  constructor(
    @InjectBroker("audit") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient,
  ) {}

  async onModuleInit(): Promise<void> {
    this.kernel = Kernel.create(this.broker, this.workflow, this.dbClient);
    this.server = await startServer({ port: service.ports?.admin_graphql ?? 0 });
    this.logger.log("Audit service started");
  }

  async onModuleDestroy(): Promise<void> {
    if (this.server) await this.server.close();
    if (this.kernel) await this.kernel.close();
    this.logger.log("Audit service stopped");
  }
}
