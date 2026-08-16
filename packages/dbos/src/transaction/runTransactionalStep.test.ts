import "reflect-metadata";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { PostgresTransactionOptions } from "@dbos-inc/postgres-datasource";
import { getSignal } from "../step/StepExecutionContext.js";
import type { DbosTransactionBridge } from "./DbosTransactionBridge.js";
import {
  TRANSACTIONAL_STEP_METADATA_KEY,
  TransactionalStep,
} from "./decorators.js";
import { TransactionalStepConfigurationError } from "./errors.js";
import {
  runTransactionalStep,
  type TransactionManagerLike,
} from "./runTransactionalStep.js";

interface ScopedDatabase {
  readonly kind: "transaction";
}

function createRuntime() {
  const database: ScopedDatabase = { kind: "transaction" };
  const callbackOrder: string[] = [];
  let receivedOptions:
    | (PostgresTransactionOptions & { name: string })
    | undefined;

  const txManager: TransactionManagerLike<ScopedDatabase> = {
    async runWithExistingTransaction<TResult>(tx, callback) {
      expect(tx).toBe(database);
      callbackOrder.push("manager");
      return callback();
    },
  };
  const bridge: DbosTransactionBridge<
    ScopedDatabase,
    PostgresTransactionOptions
  > = {
    async runTransaction<TResult>(options, callback) {
      receivedOptions = options;
      callbackOrder.push("bridge");
      return callback(database);
    },
  };

  return {
    bridge,
    callbackOrder,
    database,
    get receivedOptions() {
      return receivedOptions;
    },
    txManager,
  };
}

describe("runTransactionalStep", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(DBOS, "workflowID", "get").mockReturnValue("workflow-1");
    jest.spyOn(DBOS, "isInWorkflow").mockReturnValue(true);
  });

  it("injects the datasource transaction and a never-aborted step signal", async () => {
    const runtime = createRuntime();

    const result = await runTransactionalStep(
      async () => {
        runtime.callbackOrder.push("callback");
        expect(getSignal().aborted).toBe(false);
        return "result";
      },
      {
        methodName: "writeCatalog",
        isolationLevel: "SERIALIZABLE",
        txManager: () => runtime.txManager,
        bridge: () => runtime.bridge,
      },
    );

    expect(result).toBe("result");
    expect(runtime.callbackOrder).toEqual(["bridge", "manager", "callback"]);
    expect(runtime.receivedOptions).toEqual({
      name: "writeCatalog",
      isolationLevel: "SERIALIZABLE",
    });
    expect(runtime.receivedOptions).not.toHaveProperty("readOnly");
    expect(runtime.receivedOptions).not.toHaveProperty("timeoutMs");
    expect(runtime.receivedOptions).not.toHaveProperty("retry");
  });

  it("requires the direct DBOS workflow body before resolving dependencies", () => {
    jest.restoreAllMocks();
    jest.spyOn(DBOS, "workflowID", "get").mockReturnValue(undefined);
    jest.spyOn(DBOS, "isInWorkflow").mockReturnValue(false);
    const txManager = jest.fn();
    const bridge = jest.fn();

    expect(() =>
      runTransactionalStep(async () => null, {
        methodName: "writeCatalog",
        txManager,
        bridge,
      }),
    ).toThrow(TransactionalStepConfigurationError);
    expect(txManager).not.toHaveBeenCalled();
    expect(bridge).not.toHaveBeenCalled();
  });

  it("rejects calls nested inside another step or transaction", () => {
    jest.restoreAllMocks();
    jest.spyOn(DBOS, "workflowID", "get").mockReturnValue("workflow-1");
    jest.spyOn(DBOS, "isInWorkflow").mockReturnValue(false);
    const runtime = createRuntime();

    expect(() =>
      runTransactionalStep(async () => null, {
        methodName: "writeCatalog",
        txManager: () => runtime.txManager,
        bridge: () => runtime.bridge,
      }),
    ).toThrow("must be called directly from a DBOS workflow body");
  });

  it("lets callback errors escape unchanged", async () => {
    const runtime = createRuntime();
    const expectedError = new Error("rollback this transaction");

    await expect(
      runTransactionalStep(
        async () => {
          throw expectedError;
        },
        {
          methodName: "writeCatalog",
          txManager: () => runtime.txManager,
          bridge: () => runtime.bridge,
        },
      ),
    ).rejects.toBe(expectedError);
  });
});

describe("@TransactionalStep", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(DBOS, "workflowID", "get").mockReturnValue("workflow-1");
    jest.spyOn(DBOS, "isInWorkflow").mockReturnValue(true);
  });

  it("stores independent metadata and never calls DBOS.runStep", async () => {
    const runtime = createRuntime();
    const runStep = jest.spyOn(DBOS, "runStep");

    class Subject {
      readonly txManager = runtime.txManager;
      readonly bridge = runtime.bridge;

      @TransactionalStep<Subject, ScopedDatabase>({
        name: "catalogWrite",
        txManager: (self) => self.txManager,
        bridge: (self) => self.bridge,
      })
      async write(value: string): Promise<string> {
        return value;
      }
    }

    const metadata = Reflect.getMetadata(
      TRANSACTIONAL_STEP_METADATA_KEY,
      Subject.prototype,
      "write",
    );

    await expect(new Subject().write("saved")).resolves.toBe("saved");
    expect(metadata.name).toBe("catalogWrite");
    expect(runStep).not.toHaveBeenCalled();
  });
});
