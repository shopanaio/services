import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getServiceConfig } from "@shopana/shared-service-config";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import type { FastifyInstance } from 'fastify';
import { startServer } from './api/graphql-admin/server';
import { Kernel } from './kernel/Kernel';

const { service } = getServiceConfig("media");

@Injectable()
export class MediaNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker('media') private readonly broker: ServiceBroker,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("Media onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.dbClient);
    this.logger.debug("Kernel created");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("Media service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log('Media service stopped');
  }
}
