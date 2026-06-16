/**
 * @file Workflow Module
 * @description NestJS module for DBOS workflow integration
 */

import {
  DynamicModule,
  Global,
  Module,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { WorkflowRegistry } from "../registry/WorkflowRegistry.js";
import { WORKFLOW_CONFIG, WORKFLOW_REGISTRY } from "../registry/tokens.js";
import type { WorkflowModuleConfig } from "../core/types.js";

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
 *       name: "shopana",
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class WorkflowModule implements OnModuleInit, OnModuleDestroy {
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
        {
          // Also provide WorkflowRegistry directly for constructor injection
          provide: WorkflowRegistry,
          useExisting: WORKFLOW_REGISTRY,
        },
      ],
      exports: [WORKFLOW_REGISTRY, WorkflowRegistry],
    };
  }

  async onModuleInit(): Promise<void> {
    DBOS.setConfig({
      systemDatabaseUrl: this.config.databaseUrl,
      name: this.config.name ?? "shopana",
      systemDatabaseSchemaName: this.config.schema ?? "dbos",
    });

    // Suppress DBOS console output
    const originalLog = console.log;
    console.log = () => {};
    try {
      await DBOS.launch();
    } finally {
      console.log = originalLog;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await DBOS.shutdown();
  }
}
