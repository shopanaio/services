import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { PostgresDataSource } from "@dbos-inc/postgres-datasource";
import postgres, { type Sql, type TransactionSql } from "postgres";
import { PostgresDbosTransactionBridge } from "./PostgresDbosTransactionBridge.js";
import { runTransactionalStep } from "./runTransactionalStep.js";

const databaseUrl = process.env.DBOS_TRANSACTIONAL_STEP_TEST_DATABASE_URL;
const describeIntegration = databaseUrl ? describe : describe.skip;
const workflowPrefix = `transactional-step-${process.pid}`;

type Behavior = "success" | "failure" | "serialization-retry";

class ExternalTransactionManager {
  private current: TransactionSql | null = null;

  getConnection(): TransactionSql {
    if (!this.current) {
      throw new Error("No external transaction is active");
    }
    return this.current;
  }

  async runWithExistingTransaction<TResult>(
    tx: TransactionSql,
    callback: () => Promise<TResult>,
  ): Promise<TResult> {
    if (this.current && this.current !== tx) {
      throw new Error("Attempted to replace the active transaction");
    }

    const previous = this.current;
    this.current = tx;
    try {
      return await callback();
    } finally {
      this.current = previous;
    }
  }
}

describeIntegration("TransactionalStep DBOS integration", () => {
  let client: Sql;
  let dataSource: PostgresDataSource;
  let workflow: (key: string, behavior: Behavior) => Promise<number>;
  const callbackAttempts = new Map<string, number>();
  const txManager = new ExternalTransactionManager();

  beforeAll(async () => {
    const url = databaseUrl!;
    client = postgres(url, { max: 1, onnotice: () => {} });

    await client.unsafe(`CREATE SCHEMA IF NOT EXISTS "dbos"`);
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS "dbos".transaction_completion (
        workflow_id TEXT NOT NULL,
        function_num INT NOT NULL,
        output TEXT,
        error TEXT,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
        PRIMARY KEY (workflow_id, function_num)
      )
    `);
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS transactional_step_integration_rows (
        key TEXT PRIMARY KEY,
        value INT NOT NULL
      )
    `);

    dataSource = new PostgresDataSource(
      `${workflowPrefix}-datasource`,
      postgresOptionsFromUrl(url),
      "dbos",
    );

    expect(
      () =>
        new PostgresDataSource(
          `${workflowPrefix}-datasource`,
          postgresOptionsFromUrl(url),
          "dbos",
        ),
    ).toThrow("already registered");

    const bridge = new PostgresDbosTransactionBridge<TransactionSql>(
      dataSource,
      (transactionClient) => transactionClient,
    );

    workflow = DBOS.registerWorkflow(
      async (key: string, behavior: Behavior): Promise<number> =>
        runTransactionalStep(
          async () => {
            const attempt = (callbackAttempts.get(key) ?? 0) + 1;
            callbackAttempts.set(key, attempt);
            const transaction = txManager.getConnection();

            await transaction`
              INSERT INTO transactional_step_integration_rows (key, value)
              VALUES (${key}, 1)
              ON CONFLICT (key)
              DO UPDATE SET value = transactional_step_integration_rows.value + 1
            `;

            if (behavior === "failure") {
              throw new Error(`transactional failure attempt ${attempt}`);
            }

            if (behavior === "serialization-retry" && attempt === 1) {
              throw Object.assign(new Error("serialization failure"), {
                code: "40001",
              });
            }

            const rows = await transaction<{ value: number }[]>`
              SELECT value
              FROM transactional_step_integration_rows
              WHERE key = ${key}
            `;
            return rows[0]?.value ?? 0;
          },
          {
            methodName: "writeIntegrationRow",
            txManager: () => txManager,
            bridge: () => bridge,
          },
        ),
      { name: `${workflowPrefix}-workflow` },
    );

    DBOS.setConfig({
      systemDatabaseUrl: url,
      systemDatabaseSchemaName: "dbos",
      name: `${workflowPrefix}-app`,
    });
    await DBOS.launch();
  });

  afterAll(async () => {
    if (DBOS.isInitialized()) {
      await DBOS.shutdown({ deregister: true });
    }
    if (client) {
      await client.end();
    }
  });

  it("commits the user write and checkpoint atomically and replays success", async () => {
    const key = `success-${randomUUID()}`;
    const workflowId = `${workflowPrefix}-${randomUUID()}`;

    await expect(
      DBOS.withNextWorkflowID(workflowId, () => workflow(key, "success")),
    ).resolves.toBe(1);
    await expect(
      DBOS.withNextWorkflowID(workflowId, () => workflow(key, "success")),
    ).resolves.toBe(1);

    const rows = await client<{ value: number }[]>`
      SELECT value FROM transactional_step_integration_rows WHERE key = ${key}
    `;
    const checkpoints = await client<
      { output: string | null; error: string | null }[]
    >`
      SELECT output, error
      FROM dbos.transaction_completion
      WHERE workflow_id = ${workflowId} AND function_num = 0
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBe(1);
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0]?.output).not.toBeNull();
    expect(checkpoints[0]?.error).toBeNull();
    expect(callbackAttempts.get(key)).toBe(1);
  });

  it("rolls back user writes, checkpoints the error and replays the error", async () => {
    const key = `failure-${randomUUID()}`;
    const workflowId = `${workflowPrefix}-${randomUUID()}`;

    const firstError = await captureError(() =>
      DBOS.withNextWorkflowID(workflowId, () => workflow(key, "failure")),
    );
    const replayedError = await captureError(() =>
      DBOS.withNextWorkflowID(workflowId, () => workflow(key, "failure")),
    );

    const rows = await client`
      SELECT value FROM transactional_step_integration_rows WHERE key = ${key}
    `;
    const checkpoints = await client<
      { output: string | null; error: string | null }[]
    >`
      SELECT output, error
      FROM dbos.transaction_completion
      WHERE workflow_id = ${workflowId} AND function_num = 0
    `;

    expect(firstError.message).toBe("transactional failure attempt 1");
    expect(replayedError.message).toBe(firstError.message);
    expect(rows).toHaveLength(0);
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0]?.output).toBeNull();
    expect(checkpoints[0]?.error).not.toBeNull();
    expect(callbackAttempts.get(key)).toBe(1);
  });

  it("retries SQLSTATE 40001 without committing an intermediate write", async () => {
    const key = `serialization-${randomUUID()}`;
    const workflowId = `${workflowPrefix}-${randomUUID()}`;

    await expect(
      DBOS.withNextWorkflowID(workflowId, () =>
        workflow(key, "serialization-retry"),
      ),
    ).resolves.toBe(1);

    const rows = await client<{ value: number }[]>`
      SELECT value FROM transactional_step_integration_rows WHERE key = ${key}
    `;
    const checkpoints = await client`
      SELECT output, error
      FROM dbos.transaction_completion
      WHERE workflow_id = ${workflowId} AND function_num = 0
    `;

    expect(callbackAttempts.get(key)).toBe(2);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBe(1);
    expect(checkpoints).toHaveLength(1);
  });

  it("finds the migrated transaction completion contract at startup", async () => {
    const columns = await client<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'dbos'
        AND table_name = 'transaction_completion'
      ORDER BY ordinal_position
    `;

    expect(columns.map((column) => column.column_name)).toEqual([
      "workflow_id",
      "function_num",
      "output",
      "error",
      "created_at",
    ]);
    expect(DBOS.isInitialized()).toBe(true);
    expect(dataSource.name).toBe(`${workflowPrefix}-datasource`);
    expect(
      () =>
        new PostgresDataSource(
          `${workflowPrefix}-lazy-datasource`,
          postgresOptionsFromUrl(databaseUrl!),
          "dbos",
        ),
    ).toThrow();
  });
});

async function captureError(callback: () => Promise<unknown>): Promise<Error> {
  try {
    await callback();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error(`Expected Error, received ${String(error)}`);
  }
  throw new Error("Expected callback to throw");
}

function postgresOptionsFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    max: 2,
    onnotice: () => {},
  };
}
