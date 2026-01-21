import 'dotenv/config';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BootstrapLogger } from '@shopana/shared-kernel';
import { BootstrapModule, BootstrapModuleOptions } from './bootstrap.module';
import { getConfig } from '@shopana/shared-service-config';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Load configuration synchronously before NestFactory
  const config = getConfig();
  const services = Object.keys(config.services);

  // Get database config from first service that has it
  const dbConfig = Object.values(config.services).find((s) => s.db)?.db;
  if (!dbConfig) {
    throw new Error('No database configuration found in any service');
  }

  // Build bootstrap options
  const bootstrapOptions: BootstrapModuleOptions = {
    database: {
      db: dbConfig,
      pool: { max: 30 },
    },
  };

  // DBOS workflows - read from config.workflows or environment
  const workflowsDbUrl = config.workflows?.database_url ?? process.env.DBOS_DATABASE_URL;
  if (workflowsDbUrl) {
    bootstrapOptions.workflows = {
      databaseUrl: workflowsDbUrl,
      name: config.workflows?.app_name ?? 'shopana',
    };
  }

  // Create application context with filtered logger
  const app = await NestFactory.createApplicationContext(
    BootstrapModule.forRoot(bootstrapOptions),
    {
      logger: new BootstrapLogger(),
    },
  );

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Handle shutdown signals
  const shutdown = async (signal: string) => {
    logger.log(`Shutting down (${signal})...`);
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  // Success message
  logger.log(`✓ Ready (${services.length} services)`);

  // Keep the process alive
  await new Promise(() => {});
}

bootstrap().catch((error) => {
  logger.error('Failed to start bootstrap:', error);
  process.exit(1);
});
