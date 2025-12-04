import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';
import { config } from './config';
import { createApolloServer } from './api/graphql-admin/server';

@Injectable()
export class MediaNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaNestService.name);
  private fastify: FastifyInstance | null = null;

  async onModuleInit() {
    this.fastify = await createApolloServer({ port: config.port, grpcHost: config.platformGrpcHost });
    const address = await this.fastify.listen({ port: config.port, host: '0.0.0.0' });
    this.logger.log(`Media GraphQL Admin API running at ${address}${config.graphqlPath}`);
  }

  async onModuleDestroy() {
    if (this.fastify) await this.fastify.close();
    this.logger.log('Media service stopped');
  }
}
