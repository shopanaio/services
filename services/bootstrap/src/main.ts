import 'dotenv/config';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BootstrapModule } from './bootstrap.module';
import { loadServiceConfig } from '@shopana/shared-service-config';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  logger.log('═'.repeat(60));
  logger.log('Starting Bootstrap Service');
  logger.log('═'.repeat(60));

  // Load configuration synchronously before NestFactory
  const { vars, config: bootstrapConfig } = loadServiceConfig('bootstrap');

  logger.log(`Environment: ${vars.environment}`);
  logger.log(`Services to load: ${bootstrapConfig.services.join(', ')}`);

  // RabbitMQ is optional - read from environment variable
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    logger.log(`RabbitMQ: ${rabbitmqUrl}`);
  } else {
    logger.warn('RabbitMQ: disabled (RABBITMQ_URL not set)');
  }

  // Create application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(
    BootstrapModule.forRoot({
      rabbitmqUrl,
      prefetch: 20,
    }),
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
  logger.log(`Loaded services (${bootstrapConfig.services.length}): ${bootstrapConfig.services.join(', ')}`);
  logger.log('═'.repeat(60));

  // Keep the process alive
  await new Promise(() => {});
}

bootstrap().catch((error) => {
  logger.error('Failed to start bootstrap:', error);
  process.exit(1);
});
