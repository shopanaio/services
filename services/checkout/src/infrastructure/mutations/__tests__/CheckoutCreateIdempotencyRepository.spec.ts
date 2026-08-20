import type { SQLExecutor } from "@event-driven-io/dumbo";
import { CheckoutCreateIdempotencyRepository } from "../CheckoutCreateIdempotencyRepository.js";

const NOW = new Date("2026-08-02T10:00:00.000Z");
const LEASE_TOKEN = "0198c4d4-9c00-7000-8000-000000000001";

function request() {
  return {
    identity: {
      storeId: "0198c4d4-9c00-7000-8000-000000000002",
      connectionId: "0198c4d4-9c00-7000-8000-000000000003",
      operation: "CHECKOUT_CREATE" as const,
      idempotencyKey: "create-1",
    },
    requestHash: "a".repeat(64),
    checkoutId: "0198c4d4-9c00-7000-8000-000000000004",
    initiatingCredentialId: "0198c4d4-9c00-7000-8000-000000000005",
    ownerVisitorId: "visitor-1234567890",
    reservedIds: { lineIds: [], tagIds: [] },
  };
}

function executor(queryRows: unknown[][] = []) {
  const rows = [...queryRows];
  return {
    query: jest.fn(async () => ({ rows: rows.shift() ?? [] })),
    command: jest.fn(async () => ({ rows: [] })),
    batchQuery: jest.fn(),
    batchCommand: jest.fn(),
  } as unknown as SQLExecutor;
}

describe("CheckoutCreateIdempotencyRepository", () => {
  it("returns the fencing token created for a fresh reservation", async () => {
    const input = request();
    const execute = executor([
      [
        {
          request_hash: input.requestHash,
          checkout_id: input.checkoutId,
          initiating_credential_id: input.initiatingCredentialId,
          reserved_ids: input.reservedIds,
          status: "IN_PROGRESS",
          lease_token: LEASE_TOKEN,
          lease_expires_at: "2026-08-02T10:00:30.000Z",
          public_failure: null,
          snapshot: null,
        },
      ],
    ]);
    const repository = new CheckoutCreateIdempotencyRepository(
      execute,
      () => NOW,
      30_000,
      () => LEASE_TOKEN,
    );

    await expect(repository.reserve(input)).resolves.toEqual({
      status: "RESERVED",
      reservation: { ...input, leaseToken: LEASE_TOKEN },
    });
  });

  it("replaces the fencing token when an expired lease is reacquired", async () => {
    const input = request();
    const execute = executor([
      [],
      [
        {
          request_hash: input.requestHash,
          checkout_id: input.checkoutId,
          initiating_credential_id: input.initiatingCredentialId,
          reserved_ids: input.reservedIds,
          status: "IN_PROGRESS",
          lease_token: "0198c4d4-9c00-7000-8000-000000000099",
          lease_expires_at: "2026-08-02T09:59:59.000Z",
          public_failure: null,
          snapshot: null,
        },
      ],
      [
        {
          checkout_id: input.checkoutId,
          initiating_credential_id: input.initiatingCredentialId,
          reserved_ids: input.reservedIds,
          lease_token: LEASE_TOKEN,
        },
      ],
    ]);
    const repository = new CheckoutCreateIdempotencyRepository(
      execute,
      () => NOW,
      30_000,
      () => LEASE_TOKEN,
    );

    await expect(repository.reserve(input)).resolves.toEqual({
      status: "RESERVED",
      reservation: { ...input, leaseToken: LEASE_TOKEN },
    });
    const reacquireSql = (execute.query as jest.Mock).mock.calls[2][0] as string;
    expect(reacquireSql).toContain(`lease_token = '${LEASE_TOKEN}'`);
  });

  it("allows only the current lease owner to record a failure", async () => {
    const input = request();
    const execute = executor();
    const repository = new CheckoutCreateIdempotencyRepository(execute);

    await repository.markFailed({
      reservation: { ...input, leaseToken: LEASE_TOKEN },
      failure: { code: "TEMPORARY", message: "Retry.", retryable: true },
      final: false,
    });

    const sql = (execute.command as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain(`"lease_token" = '${LEASE_TOKEN}'`);
    expect(sql).toContain(`"status" = 'IN_PROGRESS'`);
  });
});
