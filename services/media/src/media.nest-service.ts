import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getServiceConfig } from "@shopana/shared-service-config";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { DBOS, WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/shared-kernel";
import type { FastifyInstance } from 'fastify';
import { startServer } from './api/graphql-admin/server';
import { Kernel } from './kernel/Kernel';
import {
  FileGarbageCollectorSaga,
  FileHardDeleteSaga,
  FileDeleteCleanupSaga,
} from "./sagas/index.js";
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

    // Register garbage collection sagas
    const s3Client = new S3Client();
    const hardDeleteSaga = new FileHardDeleteSaga("fileHardDelete", {
      kernel: this.kernel,
      s3Client,
    });
    const hardDeleteSagaName = this.broker.qualifyAction("fileHardDelete");
    this.workflow.register(hardDeleteSagaName, {
      instance: hardDeleteSaga,
      metadata: { name: "fileHardDelete" },
    });

    const deleteCleanupSaga = new FileDeleteCleanupSaga(
      "fileDeleteCleanup",
      { kernel: this.kernel }
    );
    const deleteCleanupSagaName =
      this.broker.qualifyAction("fileDeleteCleanup");
    this.workflow.register(deleteCleanupSagaName, {
      instance: deleteCleanupSaga,
      metadata: { name: "fileDeleteCleanup" },
    });

    const startHardDeleteSaga = async (fileId: string) => {
      await DBOS.startWorkflow(hardDeleteSaga).run(fileId);
    };

    const garbageCollectorSaga = new FileGarbageCollectorSaga(
      "fileGarbageCollector",
      { kernel: this.kernel, startHardDeleteSaga }
    );
    const garbageCollectorSagaName =
      this.broker.qualifyAction("fileGarbageCollector");
    this.workflow.register(garbageCollectorSagaName, {
      instance: garbageCollectorSaga,
      metadata: { name: "fileGarbageCollector" },
    });
    this.logger.debug("Registered GC sagas");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("Media service started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister(this.broker.qualifyAction("fileHardDelete"));
      this.workflow.deregister(this.broker.qualifyAction("fileDeleteCleanup"));
      this.workflow.deregister(
        this.broker.qualifyAction("fileGarbageCollector")
      );
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
