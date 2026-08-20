import { describe, expect, it, jest } from "@jest/globals";
import type { PostgresDataSource, PostgresTransactionOptions } from "@dbos-inc/postgres-datasource";
import type { TransactionSql } from "postgres";
import { PostgresDbosTransactionBridge } from "./PostgresDbosTransactionBridge.js";

describe("PostgresDbosTransactionBridge", () => {
  it("builds the service database from the active datasource client", async () => {
    const transactionClient = {} as TransactionSql;
    let active = false;
    let receivedOptions: PostgresTransactionOptions | undefined;

    const dataSource = {
      get client() {
        if (!active) {
          throw new Error("client accessed outside datasource transaction");
        }
        return transactionClient;
      },
      async runTransaction<TResult>(
        callback: () => Promise<TResult>,
        options?: PostgresTransactionOptions,
      ): Promise<TResult> {
        receivedOptions = options;
        active = true;
        try {
          return await callback();
        } finally {
          active = false;
        }
      },
    } as unknown as PostgresDataSource;

    const scopedDatabase = { kind: "scoped-database" };
    const createDatabase = jest.fn((_client: TransactionSql) => scopedDatabase);
    const bridge = new PostgresDbosTransactionBridge(dataSource, createDatabase);

    const result = await bridge.runTransaction(
      { name: "writeCatalog", isolationLevel: "SERIALIZABLE" },
      async (db) => {
        expect(db).toBe(scopedDatabase);
        return "committed";
      },
    );

    expect(result).toBe("committed");
    expect(createDatabase).toHaveBeenCalledWith(transactionClient);
    expect(receivedOptions).toEqual({
      name: "writeCatalog",
      isolationLevel: "SERIALIZABLE",
    });
  });

  it("does not convert a thrown error into a successful value", async () => {
    const transactionClient = {} as TransactionSql;
    const expectedError = new Error("write failed");
    const dataSource = {
      get client() {
        return transactionClient;
      },
      async runTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult> {
        return callback();
      },
    } as unknown as PostgresDataSource;
    const bridge = new PostgresDbosTransactionBridge(dataSource, () => ({
      kind: "scoped-database",
    }));

    await expect(
      bridge.runTransaction({ name: "writeCatalog" }, async () => {
        throw expectedError;
      }),
    ).rejects.toBe(expectedError);
  });
});
