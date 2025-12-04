import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kernel, SERVICE_BROKER, ServiceBroker, NestLogger } from '@shopana/shared-kernel';
import { FastifyInstance } from 'fastify';
import { dumboPool, knexInstance } from './infrastructure/db/database';
import { SlotsRepository } from './infrastructure/repositories/slotsRepository';
import { startServer } from './api/server';
import { AppsPluginManager } from './infrastructure/plugins/pluginManager';
import { execute, type ExecuteParams, type ExecuteResult, type AppsKernelServices } from './scripts/execute';

@Injectable()
export class AppsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppsNestService.name);
  private kernel!: Kernel<AppsKernelServices>;
  private graphqlServer!: FastifyInstance;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    const db = knexInstance;
    const slotsRepository = new SlotsRepository(dumboPool.execute, db);
    const pluginManager = new AppsPluginManager(new NestLogger(this.logger) as any);

    this.kernel = new Kernel<AppsKernelServices>(
      this.broker,
      new NestLogger(this.logger),
      { slotsRepository, pluginManager },
    );

    this.broker.register<ExecuteParams, ExecuteResult>(
      'execute',
      (params) => this.kernel.executeScript(execute, params!),
    );

    await db.raw('SELECT 1');
    this.graphqlServer = await startServer(this.broker as any, this.kernel as any);
    this.logger.log('Apps service started');
  }

  async onModuleDestroy() {
    if (this.graphqlServer) await this.graphqlServer.close();
    await knexInstance.destroy();
    this.logger.log('Apps service stopped');
  }
}
