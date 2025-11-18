import 'dotenv/config';
import 'reflect-metadata';

import path from 'path';
import { Module } from '@nestjs/common';
import { NestFactory, ModuleRef } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { pathToFileURL, fileURLToPath } from 'url';
import {
  NestBroker,
  createNestServiceAdapter,
  NestJsLogger,
} from '@shopana/shared-kernel';
import { loadServiceConfig, findWorkspaceRoot } from '@shopana/shared-service-config';

/**
 * Resolve the source path of a service depending on the current environment.
 */
async function getServicePath(serviceName: string, environment: string): Promise<string> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = await findWorkspaceRoot(currentDir);

  if (environment === 'development') {
    return path.join(projectRoot, 'services', serviceName, 'src', 'service.ts');
  }

  return path.join(projectRoot, 'services', serviceName, 'dist', 'src', 'service.js');
}

/**
 * Dynamically load Moleculer schemas and wrap them with NestJS adapters.
 */
async function createOrchestratorModule() {
  const { vars, config: orchestratorConfig } = loadServiceConfig('orchestrator');

  console.log('🚀 Creating NestJS Orchestrator Module...');
  console.log(`🌍 Environment: ${vars.environment}`);
  console.log(`📦 Services to load: ${orchestratorConfig.services.join(', ')}`);

  const serviceAdapters: Array<new (...args: unknown[]) => unknown> = [];

  for (const serviceName of orchestratorConfig.services) {
    try {
      const servicePath = await getServicePath(serviceName, vars.environment);
      const serviceTsconfigPath = path.join(path.dirname(servicePath), '../tsconfig.json');

      console.log(`📥 Loading service: ${serviceName} from ${servicePath}`);

      // Register tsconfig paths for this service
      const { register } = await import('tsx/esm/api');
      const unregister = register({
        tsconfig: serviceTsconfigPath
      });

      try {
        const serviceUrl = pathToFileURL(servicePath).href;
        const ServiceModule = await import(serviceUrl);
        const schema = ServiceModule.default ?? ServiceModule;

        serviceAdapters.push(createNestServiceAdapter(schema));
        console.log(`✅ Created adapter for: ${serviceName}`);
      } finally {
        unregister();
      }
    } catch (error) {
      console.error(`❌ Failed to load service ${serviceName}:`, error);
      throw error;
    }
  }

  @Module({
    providers: [
      {
        provide: 'NEST_BROKER',
        inject: [ModuleRef],
        useFactory: (moduleRef: ModuleRef) => {
          const logger = new NestJsLogger('Orchestrator');
          return new NestBroker(moduleRef, logger);
        },
      },
      ...serviceAdapters,
    ],
    exports: ['NEST_BROKER'],
  })
  class DynamicOrchestratorModule {}

  return { module: DynamicOrchestratorModule, vars, orchestratorConfig };
}

/**
 * Bootstrap NestJS orchestrator application and keep it alive.
 */
async function bootstrap() {
  console.log('═'.repeat(60));
  console.log('🚀 Starting NestJS Orchestrator');
  console.log('═'.repeat(60));

  try {
    const { module: OrchestratorModule, orchestratorConfig } = await createOrchestratorModule();

    const app = await NestFactory.create<NestFastifyApplication>(
      OrchestratorModule,
      new FastifyAdapter(),
      {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      }
    );

    app.enableShutdownHooks();
    await app.init();

    console.log('═'.repeat(60));
    console.log('✅ NestJS Orchestrator started successfully');
    console.log('📡 Communication: Direct method calls (zero latency)');
    console.log(`📦 Loaded services (${orchestratorConfig.services.length}): ${orchestratorConfig.services.join(', ')}`);
    console.log('═'.repeat(60));

    await new Promise(() => {});
  } catch (error) {
    console.error('💥 Failed to start orchestrator:', error);
    process.exit(1);
  }
}

bootstrap();
