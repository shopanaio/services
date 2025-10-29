const putObjectMock = jest.fn();
const clientCtorMock = jest.fn(() => ({
  putObject: putObjectMock,
}));

jest.mock("minio", () => ({
  Client: clientCtorMock,
}));

import { resolve } from "node:path";
import type { ProviderContextLike, HttpClient } from "@shopana/plugin-sdk";
import { TildaImportProvider } from "../provider";

const feedPath = resolve(__dirname, "../feed-fb.csv");

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const httpStub: HttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const ctx: ProviderContextLike<HttpClient> = {
  logger: loggerMock,
  createHttp: () => httpStub,
};

describe("TildaImportProvider.inventory.createUpdateTask", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clientCtorMock.mockImplementation(() => ({
      putObject: putObjectMock,
    }));
    putObjectMock.mockResolvedValue("test-etag");
  });

  it("формирует задачу обновления инвентаря в стандартизированном формате", async () => {
    const provider = new TildaImportProvider(ctx, {
      feed: {
        source: "file",
        path: feedPath,
      },
      storage: {
        endpoint: "https://storage.test:9000",
        accessKey: "test-access",
        secretKey: "test-secret",
        bucket: "inventory",
        prefix: "tilda",
      },
    });

    const task = await provider.inventory.createUpdateTask({
      limit: 3,
      integrationId: "test-integration",
      correlationId: "corr-1",
      requestedBy: "tests",
      issuedAt: "2024-01-02T10:00:00.000Z",
      taskId: "task-1",
    });

    expect(task.source.pluginCode).toBe("tilda");
    expect(task.source.integrationId).toBe("test-integration");
    expect(task.source.feedType).toBe("facebook_csv");
    expect(task.meta?.correlationId).toBe("corr-1");
    expect(task.meta?.requestedBy).toBe("tests");
    expect(task.meta?.taskId).toBe("task-1");
    expect(task.meta?.payloadFormat).toBe("json");
    expect(task.meta?.compression).toBe("none");
    expect(task.meta?.itemCount).toBe(3);

    expect(task.storage.bucket).toBe("inventory");
    expect(task.storage.provider).toBe("s3");
    expect(task.storage.objectKey).toBe(
      "tilda/2024/01/02/task-1.json"
    );
    expect(task.storage.contentType).toBe("application/json");
    expect(task.storage.contentLength).toBeGreaterThan(0);
    expect(task.storage.checksum?.algorithm).toBe("sha256");
    expect(task.storage.checksum?.value).toHaveLength(64);
    expect(task.storage.metadata?.etag).toBe("test-etag");

    expect(putObjectMock).toHaveBeenCalledTimes(1);
    const putArgs = putObjectMock.mock.calls[0];
    expect(putArgs[0]).toBe("inventory");
    expect(putArgs[1]).toBe("tilda/2024/01/02/task-1.json");
    expect(putArgs[2]).toBeInstanceOf(Buffer);
    expect(typeof putArgs[3]).toBe("number");
    expect(putArgs[4]).toMatchObject({
      "Content-Type": "application/json",
      "x-amz-meta-checksum-sha256": expect.any(String),
    });
  });
});
