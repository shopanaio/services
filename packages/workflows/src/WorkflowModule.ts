import { DynamicModule, Global, Module, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { DBOS } from '@dbos-inc/dbos-sdk';
import { WorkflowRegistry } from './WorkflowRegistry.js';
import type { WorkflowModuleConfig } from './types.js';

export const WORKFLOW_REGISTRY = Symbol('WORKFLOW_REGISTRY');
export const WORKFLOW_CONFIG = Symbol('WORKFLOW_CONFIG');

/**
 * NestJS module for DBOS workflow integration.
 *
 * Provides the WorkflowRegistry as a global injectable service and manages
 * DBOS lifecycle (launch/shutdown).
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     WorkflowModule.forRoot({
 *       databaseUrl: process.env.DBOS_DATABASE_URL,
 *       name: 'shopana',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class WorkflowModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowModule.name);

  constructor(
    @Inject(WORKFLOW_CONFIG) private readonly config: WorkflowModuleConfig,
  ) {}

  static forRoot(config: WorkflowModuleConfig): DynamicModule {
    return {
      module: WorkflowModule,
      providers: [
        {
          provide: WORKFLOW_CONFIG,
          useValue: config,
        },
        {
          provide: WORKFLOW_REGISTRY,
          useClass: WorkflowRegistry,
        },
      ],
      exports: [WORKFLOW_REGISTRY],
    };
  }

  async onModuleInit() {
    this.logger.log('Initializing DBOS workflows...');

    // Configure and launch DBOS
    DBOS.setConfig({
      databaseUrl: this.config.databaseUrl,
      name: this.config.name ?? 'shopana',
      systemDatabaseSchemaName: this.config.schema ?? 'dbos',
    });

    await DBOS.launch();
    this.logger.log('DBOS workflows initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down DBOS workflows...');
    await DBOS.shutdown();
    this.logger.log('DBOS workflows shut down');
  }
}
