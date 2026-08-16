import {
  PostgresDataSource,
  PostgresDbosTransactionBridge,
  type DatabaseConnectionOptions,
  type DbosTransactionBridge,
  type PostgresTransactionOptions,
} from "@shopana/shared-kernel";
import {
  createTransactionalDatabase,
  type Database,
} from "./database.js";

export const CATALOG_DBOS_DATASOURCE_NAME = "catalog-db";
export const CATALOG_DBOS_DATASOURCE_SCHEMA = "dbos";
export const CATALOG_DBOS_DATASOURCE_POOL_MAX = 2;

export type CatalogDbosTransactionBridge = DbosTransactionBridge<
  Database,
  PostgresTransactionOptions
>;

/**
 * Build a DBOS datasource before DBOS.launch(). The datasource owns this
 * separate bounded pool and DBOS.shutdown() closes it.
 */
export function createCatalogDbosTransactionBridge(
  connection: DatabaseConnectionOptions
): CatalogDbosTransactionBridge {
  const dataSource = new PostgresDataSource(
    CATALOG_DBOS_DATASOURCE_NAME,
    createCatalogDbosDataSourceOptions(connection),
    CATALOG_DBOS_DATASOURCE_SCHEMA
  );

  return new PostgresDbosTransactionBridge(
    dataSource,
    createTransactionalDatabase
  );
}

/**
 * Do not inherit the shared pool max: every DBOS datasource consumes a
 * separate connection budget.
 */
export function createCatalogDbosDataSourceOptions(
  connection: DatabaseConnectionOptions
) {
  return Object.freeze({
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    database: connection.database,
    max: CATALOG_DBOS_DATASOURCE_POOL_MAX,
    idle_timeout: connection.idle_timeout,
    connect_timeout: connection.connect_timeout,
    max_lifetime: connection.max_lifetime,
    onnotice: () => {},
  });
}
