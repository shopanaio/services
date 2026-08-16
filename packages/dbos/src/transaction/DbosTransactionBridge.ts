/**
 * Bridge between a DBOS datasource transaction and a service-specific
 * database abstraction.
 */
export interface DbosTransactionBridge<TDatabase, TConfig extends object> {
  runTransaction<TResult>(
    options: TConfig & { name: string },
    callback: (db: TDatabase) => Promise<TResult>,
  ): Promise<TResult>;
}
