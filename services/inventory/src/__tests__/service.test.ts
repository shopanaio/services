import { createHash } from "crypto";
import { gzipSync } from "node:zlib";
import type { LoggerInstance } from "moleculer";
import type { InventoryUpdateTask } from "@shopana/import-plugin-sdk";
import { processInventoryUpdate } from "../service";

jest.mock("@shopana/shared-service-config", () => ({
  loadServiceConfig: () => ({
    vars: {
      environment: "test",
      log_level: "info",
      moleculer_transporter: "nats://localhost",
      object_storage_endpoint: "https://storage.test:9000",
      object_storage_access_key: "access",
      object_storage_secret_key: "secret",
      object_storage_bucket: "inventory",
    },
  }),
}));

describe("InventoryService.methods.handleInventoryUpdate", () => {
  let logger: LoggerInstance;

  const storageGateway = {
    download: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    logger = createLoggerMock();
  });

  it("загружает и обрабатывает обновления без компрессии", async () => {
    const entries = [
      {
        operation: "UPSERT",
        item: {
          sku: "SKU-1",
          hash: "hash-1",
        },
      },
    ];
    const buffer = Buffer.from(JSON.stringify(entries), "utf8");
    const checksum = createHash("sha256").update(buffer).digest("hex");

    storageGateway.download.mockResolvedValue({
      buffer,
      contentType: "application/json",
    });

    const task: InventoryUpdateTask = {
      source: {
        pluginCode: "tilda",
        feedType: "facebook_csv",
      },
      storage: {
        provider: "s3",
        bucket: "inventory",
        objectKey: "updates/task-1.json",
        contentType: "application/json",
        contentLength: buffer.byteLength,
        checksum: {
          algorithm: "sha256",
          value: checksum,
        },
      },
      issuedAt: "2024-01-02T10:00:00.000Z",
      meta: {
        taskId: "task-1",
        compression: "none",
        payloadFormat: "json",
        itemCount: 1,
      },
    };

    await processInventoryUpdate(
      {
        logger,
        storageGateway,
      },
      task
    );

    expect(storageGateway.download).toHaveBeenCalledWith(task.storage);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginCode: "tilda",
        bucket: "inventory",
        objectKey: "updates/task-1.json",
        items: 1,
      }),
      "Inventory update task received"
    );
  });

  it("распаковывает gzip-данные перед обработкой", async () => {
    const entries = [
      {
        operation: "UPSERT",
        item: {
          sku: "SKU-2",
          hash: "hash-2",
        },
      },
    ];
    const rawBuffer = Buffer.from(JSON.stringify(entries), "utf8");
    const gzipped = gzipSync(rawBuffer);
    const checksum = createHash("sha256").update(rawBuffer).digest("hex");

    storageGateway.download.mockResolvedValue({
      buffer: gzipped,
      contentType: "application/json",
    });

    const task: InventoryUpdateTask = {
      source: {
        pluginCode: "tilda",
        feedType: "facebook_csv",
      },
      storage: {
        provider: "s3",
        bucket: "inventory",
        objectKey: "updates/task-2.json",
        contentType: "application/json",
        contentLength: gzipped.byteLength,
        checksum: {
          algorithm: "sha256",
          value: checksum,
        },
      },
      issuedAt: "2024-01-03T10:00:00.000Z",
      meta: {
        taskId: "task-2",
        compression: "gzip",
        payloadFormat: "json",
        itemCount: 1,
      },
    };

    await processInventoryUpdate(
      {
        logger,
        storageGateway,
      },
      task
    );

    expect(storageGateway.download).toHaveBeenCalledWith(task.storage);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: "updates/task-2.json",
        items: 1,
      }),
      "Inventory update task received"
    );
  });
});

function createLoggerMock(): LoggerInstance {
  const baseLogger = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    child: jest.fn(),
  } satisfies Partial<LoggerInstance>;

  baseLogger.child = jest
    .fn()
    .mockImplementation(() => createLoggerMock());

  return baseLogger as LoggerInstance;
}
