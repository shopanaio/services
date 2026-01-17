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
import { FileGarbageCollectorWorkflow, FileHardDeleteWorkflow } from "./workflows/index.js";
import { S3Client } from "./infrastructure/S3Client.js";

const { service } = getServiceConfig("media");

@Injectable()
export class MediaNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectBroker('media') private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("Media onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    const s3Client = new S3Client();
    const hardDeleteWorkflow = new FileHardDeleteWorkflow("fileHardDelete", {
      kernel: this.kernel,
      s3Client,
    });
    this.workflow.register("fileHardDelete", hardDeleteWorkflow);
    this.logger.debug("Registered workflow: fileHardDelete");

    const startHardDeleteWorkflow = async (fileId: string) => {
      await DBOS.startWorkflow(hardDeleteWorkflow).run(fileId);
    };

    const garbageCollectorWorkflow = new FileGarbageCollectorWorkflow(
      "fileGarbageCollector",
      {
        kernel: this.kernel,
        startHardDeleteWorkflow,
      }
    );
    this.workflow.register("fileGarbageCollector", garbageCollectorWorkflow);
    this.logger.debug("Registered workflow: fileGarbageCollector");

    const startGarbageCollector = async () => {
      try {
        await DBOS.startWorkflow(garbageCollectorWorkflow).run();
      } catch (error) {
        this.logger.error({ error }, "Failed to start file GC workflow");
      }
    };

    const GC_INTERVAL_MS = 15 * 60 * 1000;
    this.gcInterval = setInterval(() => {
      void startGarbageCollector();
    }, GC_INTERVAL_MS);

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("Media service started");
  }

  async onModuleDestroy() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }

    if (this.workflow) {
      this.workflow.deregister("fileHardDelete");
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
