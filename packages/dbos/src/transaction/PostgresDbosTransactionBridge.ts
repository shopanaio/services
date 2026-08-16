import {
  PostgresDataSource,
  type PostgresTransactionOptions,
} from "@dbos-inc/postgres-datasource";
import type { TransactionSql } from "postgres";
import type { DbosTransactionBridge } from "./DbosTransactionBridge.js";

/**
 * Adapts the active Postgres.js transaction owned by a DBOS datasource to the
 * database type expected by a service repository graph.
 */
export class PostgresDbosTransactionBridge<
  TDatabase,
  TConfig extends PostgresTransactionOptions = PostgresTransactionOptions,
> implements DbosTransactionBridge<TDatabase, TConfig>
{
  constructor(
    private readonly dataSource: PostgresDataSource,
    private readonly createDatabase: (client: TransactionSql) => TDatabase,
  ) {}

  runTransaction<TResult>(
    options: TConfig & { name: string },
    callback: (db: TDatabase) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.runTransaction(
      () => callback(this.createDatabase(this.dataSource.client)),
      options,
    );
  }
}
