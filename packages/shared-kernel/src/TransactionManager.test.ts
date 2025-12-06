import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { TransactionManager, type TransactionalDatabase } from "./TransactionManager";

// Simple mock transaction type
interface MockTx {
  query: jest.Mock;
}

// Mock database type
interface MockDb extends TransactionalDatabase<MockTx> {
  transactionCallCount: number;
  lastTransaction: MockTx | null;
}

/**
 * Mock database that simulates Drizzle transaction behavior
 */
function createMockDatabase(): { mockDb: MockDb; mockTx: MockTx } {
  const mockTx: MockTx = {
    query: jest.fn(),
  };

  const mockDb: MockDb = {
    transactionCallCount: 0,
    lastTransaction: null,
    transaction: jest.fn(async <T>(fn: (tx: MockTx) => Promise<T>): Promise<T> => {
      mockDb.transactionCallCount++;
      mockDb.lastTransaction = mockTx;
      return await fn(mockTx);
    }) as MockDb["transaction"],
  };

  return { mockDb, mockTx };
}

describe("TransactionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("run()", () => {
    it("should create new transaction when none exists", async () => {
      const { mockDb, mockTx } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      let connectionInside: unknown;

      await txManager.run(async () => {
        connectionInside = txManager.getConnection();
        return "result";
      });

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(connectionInside).toBe(mockTx);
    });

    it("should return result from function", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const result = await txManager.run(async () => {
        return { success: true, data: [1, 2, 3] };
      });

      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });

    it("should reuse existing transaction in nested calls", async () => {
      const { mockDb, mockTx } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      let outerConnection: unknown;
      let innerConnection: unknown;

      await txManager.run(async () => {
        outerConnection = txManager.getConnection();

        // Nested call
        await txManager.run(async () => {
          innerConnection = txManager.getConnection();
          return "inner";
        });

        return "outer";
      });

      // transaction() called only once (not twice)
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      // Both use the same transaction
      expect(outerConnection).toBe(mockTx);
      expect(innerConnection).toBe(mockTx);
    });

    it("should handle deeply nested calls", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const depths: number[] = [];

      await txManager.run(async () => {
        depths.push(TransactionManager.getDepth());

        await txManager.run(async () => {
          depths.push(TransactionManager.getDepth());

          await txManager.run(async () => {
            depths.push(TransactionManager.getDepth());
            return "level3";
          });

          depths.push(TransactionManager.getDepth());
          return "level2";
        });

        depths.push(TransactionManager.getDepth());
        return "level1";
      });

      expect(depths).toEqual([1, 2, 3, 2, 1]);
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it("should rollback and rethrow on error", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const testError = new Error("Test error");

      await expect(
        txManager.run(async () => {
          throw testError;
        })
      ).rejects.toThrow("Test error");

      // Transaction was started (Drizzle handles rollback internally)
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it("should rollback all changes when nested call throws", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const operations: string[] = [];

      await expect(
        txManager.run(async () => {
          operations.push("outer-start");

          await txManager.run(async () => {
            operations.push("inner-start");
            throw new Error("Inner error");
          });

          operations.push("outer-end"); // Should not reach here
          return "result";
        })
      ).rejects.toThrow("Inner error");

      expect(operations).toEqual(["outer-start", "inner-start"]);
      // Single transaction — Drizzle will rollback everything
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("getConnection()", () => {
    it("should return db when not in transaction", () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const connection = txManager.getConnection();

      expect(connection).toBe(mockDb);
    });

    it("should return tx when in transaction", async () => {
      const { mockDb, mockTx } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      await txManager.run(async () => {
        const connection = txManager.getConnection();
        expect(connection).toBe(mockTx);
        return null;
      });
    });
  });

  describe("static methods", () => {
    it("getCurrent() should return null when not in transaction", () => {
      expect(TransactionManager.getCurrent()).toBeNull();
    });

    it("getCurrent() should return tx when in transaction", async () => {
      const { mockDb, mockTx } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      await txManager.run(async () => {
        const current = TransactionManager.getCurrent();
        expect(current).toBe(mockTx);
        return null;
      });
    });

    it("isInTransaction() should return false when not in transaction", () => {
      expect(TransactionManager.isInTransaction()).toBe(false);
    });

    it("isInTransaction() should return true when in transaction", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      await txManager.run(async () => {
        expect(TransactionManager.isInTransaction()).toBe(true);
        return null;
      });
    });

    it("getDepth() should return 0 when not in transaction", () => {
      expect(TransactionManager.getDepth()).toBe(0);
    });

    it("getDepth() should track nesting depth", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      await txManager.run(async () => {
        expect(TransactionManager.getDepth()).toBe(1);

        await txManager.run(async () => {
          expect(TransactionManager.getDepth()).toBe(2);
          return null;
        });

        expect(TransactionManager.getDepth()).toBe(1);
        return null;
      });

      expect(TransactionManager.getDepth()).toBe(0);
    });
  });

  describe("runWithoutTransaction()", () => {
    it("should execute function without creating transaction", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const result = await txManager.runWithoutTransaction(async () => {
        return "no-tx-result";
      });

      expect(result).toBe("no-tx-result");
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it("should not affect existing transaction context", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      await txManager.run(async () => {
        expect(TransactionManager.isInTransaction()).toBe(true);

        // This doesn't clear the transaction context
        await txManager.runWithoutTransaction(async () => {
          // Still in the same async context
          expect(TransactionManager.isInTransaction()).toBe(true);
          return null;
        });

        expect(TransactionManager.isInTransaction()).toBe(true);
        return null;
      });
    });
  });

  describe("concurrent transactions", () => {
    it("should isolate transactions between concurrent requests", async () => {
      const { mockDb } = createMockDatabase();
      const txManager = new TransactionManager<MockDb, MockTx>(mockDb);

      const results: string[] = [];

      // Simulate two concurrent requests
      await Promise.all([
        txManager.run(async () => {
          results.push("req1-start");
          await new Promise((r) => setTimeout(r, 10));
          results.push("req1-end");
          return "req1";
        }),
        txManager.run(async () => {
          results.push("req2-start");
          await new Promise((r) => setTimeout(r, 5));
          results.push("req2-end");
          return "req2";
        }),
      ]);

      // Each request got its own transaction
      expect(mockDb.transaction).toHaveBeenCalledTimes(2);

      // Order depends on timing, but both should complete
      expect(results).toContain("req1-start");
      expect(results).toContain("req1-end");
      expect(results).toContain("req2-start");
      expect(results).toContain("req2-end");
    });
  });
});
