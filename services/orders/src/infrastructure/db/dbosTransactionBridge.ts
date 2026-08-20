import {
  PostgresDataSource,
  PostgresDbosTransactionBridge,
  type DatabaseConnectionOptions,
  type DbosTransactionBridge,
  type PostgresTransactionOptions,
} from "@shopana/shared-kernel";
import { createTransactionalDatabase, type Database } from "./database.js";

export type OrdersDbosTransactionBridge = DbosTransactionBridge<
  Database,
  PostgresTransactionOptions
>;

export function createOrdersDbosTransactionBridge(
  connection: DatabaseConnectionOptions,
): OrdersDbosTransactionBridge {
  const dataSource = new PostgresDataSource(
    "orders-db",
    {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      database: connection.database,
      max: 2,
      idle_timeout: connection.idle_timeout,
      connect_timeout: connection.connect_timeout,
      max_lifetime: connection.max_lifetime,
      onnotice: () => {},
    },
    "dbos",
  );
  return new PostgresDbosTransactionBridge(dataSource, createTransactionalDatabase);
}
