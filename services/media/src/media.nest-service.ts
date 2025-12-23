import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getServiceConfig, buildDatabaseUrl } from "@shopana/shared-service-config";
import { InjectBroker, ServiceBroker, type GetResourcesResult } from "@shopana/shared-kernel";
import type { FastifyInstance } from 'fastify';
import { startServer } from './api/graphql-admin/server';
import { getResources } from './scripts/resources/index';

const { service, global } = getServiceConfig("media");

@Injectable()
export class MediaNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaNestService.name);
  private fastify: FastifyInstance | null = null;

  constructor(@InjectBroker('media') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    // Resource discovery for IAM service
    this.broker.register<void, GetResourcesResult>("getResources", getResources);
    this.logger.debug("Action media.getResources registered");

    const port = service.ports?.admin_graphql ?? 0;
    const graphqlPath = service.graphql?.path ?? "/graphql/admin";
    this.fastify = await startServer({
      port,
      grpcHost: global.platform_grpc_host,
      databaseUrl: service.db ? buildDatabaseUrl(service.db) : "",
    });
    this.logger.log(`Media GraphQL Admin API running at http://localhost:${port}${graphqlPath}`);
  }

  async onModuleDestroy() {
    if (this.fastify) await this.fastify.close();
    this.logger.log('Media service stopped');
  }
}
