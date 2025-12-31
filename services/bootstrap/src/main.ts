import 'dotenv/config';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BootstrapModule, BootstrapModuleOptions } from './bootstrap.module';
import { getConfig, getServiceConfig } from '@shopana/shared-service-config';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  logger.log('═'.repeat(60));
  logger.log('Starting Bootstrap Service');
  logger.log('═'.repeat(60));

  // Load configuration synchronously before NestFactory
  const config = getConfig();
  const services = Object.keys(config.services);

  logger.log(`Environment: ${config.global.environment}`);
  logger.log(`Services to load: ${services.join(', ')}`);

  // RabbitMQ is optional - read from environment variable
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    logger.log(`RabbitMQ: ${rabbitmqUrl}`);
  } else {
    logger.warn('RabbitMQ: disabled (RABBITMQ_URL not set)');
  }

  // Get database config from first service that has it
  const dbConfig = Object.values(config.services).find((s) => s.db)?.db;
  if (!dbConfig) {
    throw new Error('No database configuration found in any service');
  }

  // Build bootstrap options
  const bootstrapOptions: BootstrapModuleOptions = {
    rabbitmqUrl,
    prefetch: 20,
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
      schema: config.workflows?.schema ?? 'dbos',
    };
    logger.log('DBOS Workflows: enabled');
  } else {
    logger.warn('DBOS Workflows: disabled (no database URL configured)');
  }

  // Create application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(
    BootstrapModule.forRoot(bootstrapOptions),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    },
  );

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Handle shutdown signals
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('Bootstrap stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  logger.log('═'.repeat(60));
  logger.log('Bootstrap Service started successfully');
  logger.log('Communication: Direct method calls (zero latency)');
  logger.log(`Loaded services (${services.length}): ${services.join(', ')}`);
  logger.log('═'.repeat(60));

  // Keep the process alive
  await new Promise(() => {});
}

bootstrap().catch((error) => {
  logger.error('Failed to start bootstrap:', error);
  process.exit(1);
});
