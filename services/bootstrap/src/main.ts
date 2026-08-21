import "dotenv/config";
import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { BootstrapLogger } from "@shopana/shared-kernel";
import { BootstrapModule, BootstrapModuleOptions } from "./bootstrap.module";
import { getConfig } from "@shopana/shared-service-config";

const logger = new Logger("Bootstrap");
const PROCESS_LISTENER_HEADROOM = 20;

async function bootstrap() {
  // Load configuration synchronously before NestFactory
  const config = getConfig();
  const services = Object.keys(config.services);

  // The modular monolith hosts multiple HTTP and GraphQL runtimes in one
  // process. Each runtime may install bounded SIGINT/SIGTERM cleanup hooks.
  process.setMaxListeners(
    Math.max(process.getMaxListeners(), services.length + PROCESS_LISTENER_HEADROOM),
  );

  // Get database config from first service that has it
  const dbConfig = Object.values(config.services).find((s) => s.db)?.db;
  if (!dbConfig) {
    throw new Error("No database configuration found in any service");
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
    const listingIndexWorkerConcurrency = parsePositiveInteger(
      process.env.LISTING_INDEX_ACTIONS_WORKER_CONCURRENCY,
      1,
    );
    const catalogAggregateMutationsWorkerConcurrency = parsePositiveInteger(
      process.env.CATALOG_AGGREGATE_MUTATIONS_WORKER_CONCURRENCY,
      10,
    );
    const recommendationSnapshotWorkerConcurrency = parsePositiveInteger(
      process.env.RECOMMENDATION_SNAPSHOT_WORKER_CONCURRENCY,
      20,
    );
    const recommendationIngestionWorkerConcurrency = parsePositiveInteger(
      process.env.RECOMMENDATION_INGESTION_WORKER_CONCURRENCY,
      20,
    );
    bootstrapOptions.workflows = {
      databaseUrl: workflowsDbUrl,
      name: config.workflows?.app_name ?? "shopana",
      schema: config.workflows?.schema,
      queues: [
        {
          name: "listing_index_actions",
          partitionQueue: true,
          concurrency: listingIndexWorkerConcurrency,
          workerConcurrency: listingIndexWorkerConcurrency,
          onConflict: "update_if_latest_version",
        },
        {
          name: "catalog_aggregate_mutations",
          partitionQueue: true,
          concurrency: catalogAggregateMutationsWorkerConcurrency,
          workerConcurrency: catalogAggregateMutationsWorkerConcurrency,
        },
        {
          name: "recommendation_snapshot_build",
          partitionQueue: true,
          concurrency: recommendationSnapshotWorkerConcurrency,
          workerConcurrency: recommendationSnapshotWorkerConcurrency,
          onConflict: "update_if_latest_version",
        },
        {
          name: "recommendation_order_fact_ingestion",
          partitionQueue: true,
          concurrency: recommendationIngestionWorkerConcurrency,
          workerConcurrency: recommendationIngestionWorkerConcurrency,
        },
        {
          name: "customer_statistics_projection",
          partitionQueue: true,
          concurrency: 4,
          workerConcurrency: 4,
        },
        {
          name: "customer_data_request_processing",
          concurrency: 2,
          workerConcurrency: 2,
        },
      ],
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
  // NestJS will automatically handle SIGTERM and SIGINT
  app.enableShutdownHooks();

  // Success message
  logger.log(`✓ Ready (${services.length} services)`);

  // Keep the process alive
  await new Promise(() => {});
}

bootstrap().catch((error) => {
  logger.error("Failed to start bootstrap:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
