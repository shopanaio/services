import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getServiceConfig } from "@shopana/shared-service-config";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { DBOS, WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";
import type { FastifyInstance } from 'fastify';
import { startServer } from './api/graphql-admin/server';
import { Kernel } from './kernel/Kernel';
import {
  FileGarbageCollectorWorkflow,
  FileHardDeleteWorkflow,
  FileDeleteCleanupWorkflow,
} from "./workflows/index.js";
import { S3Client } from "./infrastructure/S3Client.js";

const { service } = getServiceConfig("media");

@Injectable()
export class MediaNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker('media') private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("Media onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    // Register garbage collection workflows
    const s3Client = new S3Client();
    const hardDeleteWorkflow = new FileHardDeleteWorkflow("fileHardDelete", {
      kernel: this.kernel,
      s3Client,
    });
    this.workflow.register("fileHardDelete", hardDeleteWorkflow);

    const deleteCleanupWorkflow = new FileDeleteCleanupWorkflow(
      "fileDeleteCleanup",
      { kernel: this.kernel }
    );
    this.workflow.register("fileDeleteCleanup", deleteCleanupWorkflow);

    const startHardDeleteWorkflow = async (fileId: string) => {
      await DBOS.startWorkflow(hardDeleteWorkflow).run(fileId);
    };

    const garbageCollectorWorkflow = new FileGarbageCollectorWorkflow(
      "fileGarbageCollector",
      { kernel: this.kernel, startHardDeleteWorkflow }
    );
    this.workflow.register("fileGarbageCollector", garbageCollectorWorkflow);
    this.logger.debug("Registered GC workflows");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("Media service started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister("fileHardDelete");
      this.workflow.deregister("fileDeleteCleanup");
      this.workflow.deregister("fileGarbageCollector");
    }

    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log('Media service stopped');
  }
}
