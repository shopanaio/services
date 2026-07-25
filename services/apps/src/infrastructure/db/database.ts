import knex from 'knex';
import { getServiceConfig, buildDatabaseUrl } from "@shopana/shared-service-config";

const { service } = getServiceConfig("apps");
const databaseUrl = service.db ? buildDatabaseUrl(service.db) : "";

// Knex for regular SQL operations
export const knexInstance = knex({
  client: 'pg',
  connection: databaseUrl,
  pool: {
    min: 2,
    max: 10,
  },
  acquireConnectionTimeout: 60000,
  migrations: {
    tableName: 'knex_migrations'
  }
});

// Connection check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await knexInstance.raw('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnections() {
  await knexInstance.destroy();
}
