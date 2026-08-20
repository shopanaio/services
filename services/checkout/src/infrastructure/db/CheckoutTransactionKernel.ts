import { Inject, Injectable } from "@nestjs/common";
import type { SQLExecutor } from "@event-driven-io/dumbo";
import {
  DATABASE_CONNECTION_OPTIONS,
  PostgresDataSource,
  PostgresDbosTransactionBridge,
  TransactionManager,
  type DatabaseConnectionOptions,
  type DbosTransactionBridge,
  type PostgresTransactionOptions,
  type TransactionSql,
} from "@shopana/shared-kernel";
import { dumboPool } from "./dumbo.js";

export interface CheckoutDatabase extends SQLExecutor {
  transaction<TResult>(callback: (transaction: SQLExecutor) => Promise<TResult>): Promise<TResult>;
}

@Injectable()
export class CheckoutTransactionKernel {
  readonly database: CheckoutDatabase;
  readonly txManager: TransactionManager<CheckoutDatabase, SQLExecutor>;
  readonly dbosTransactionBridge: DbosTransactionBridge<SQLExecutor, PostgresTransactionOptions>;

  constructor(
    @Inject(DATABASE_CONNECTION_OPTIONS)
    connection: DatabaseConnectionOptions,
  ) {
    this.database = Object.assign(dumboPool.execute, {
      transaction: <TResult>(callback: (transaction: SQLExecutor) => Promise<TResult>) =>
        dumboPool.withTransaction((transaction) => callback(transaction.execute)),
    });
    this.txManager = new TransactionManager<CheckoutDatabase, SQLExecutor>(this.database);
    const dataSource = new PostgresDataSource(
      "checkout-db",
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
    this.dbosTransactionBridge = new PostgresDbosTransactionBridge(
      dataSource,
      transactionSqlExecutor,
    );
  }
}

function transactionSqlExecutor(client: TransactionSql): SQLExecutor {
  const run = async <TResult extends Record<string, unknown>>(statement: string) => {
    const rows = await client.unsafe<TResult[]>(statement);
    return { rows: [...rows], rowCount: rows.count ?? rows.length };
  };
  return {
    query: (statement) => run(statement),
    command: (statement) => run(statement),
    batchQuery: (statements) => Promise.all(statements.map((statement) => run(statement))),
    batchCommand: (statements) => Promise.all(statements.map((statement) => run(statement))),
  } as SQLExecutor;
}
