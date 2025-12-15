import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';
import { config } from './config';
import { startServer } from './api/graphql-admin/server';

@Injectable()
export class MediaNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaNestService.name);
  private fastify: FastifyInstance | null = null;

  async onModuleInit() {
    this.fastify = await startServer({
      port: config.port,
      grpcHost: config.platformGrpcHost,
      databaseUrl: config.databaseUrl,
    });
    this.logger.log(`Media GraphQL Admin API running at http://localhost:${config.port}${config.graphqlPath}`);
  }

  async onModuleDestroy() {
    if (this.fastify) await this.fastify.close();
    this.logger.log('Media service stopped');
  }
}
