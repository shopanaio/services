import { Readable } from "node:stream";
import { createHash } from "crypto";
import { InventoryObjectStorage } from "../storage";

jest.mock("minio", () => {
  const getObjectMock = jest.fn();
  const clientCtorMock = jest.fn(() => ({
    getObject: getObjectMock,
  }));

  return {
    __esModule: true,
    Client: clientCtorMock,
    __mock: {
      getObjectMock,
      clientCtorMock,
    },
  };
});

const {
  __mock: { getObjectMock, clientCtorMock },
} = jest.requireMock("minio") as {
  __mock: {
    getObjectMock: jest.Mock;
    clientCtorMock: jest.Mock;
  };
};

describe("InventoryObjectStorage", () => {
beforeEach(() => {
  jest.resetAllMocks();
  clientCtorMock.mockImplementation(() => ({
    getObject: getObjectMock,
  }));
});

  it("загружает данные и проверяет sha256", async () => {
    const payload = Buffer.from(JSON.stringify({ test: true }), "utf8");
    getObjectMock.mockResolvedValue(Readable.from([payload]));

    const storage = new InventoryObjectStorage({
      endpoint: "https://storage.test:9000",
      accessKey: "access",
      secretKey: "secret",
      bucket: "inventory",
    });

    const checksum = createHash("sha256")
      .update(payload)
      .digest("hex");

    const result = await storage.download({
      provider: "s3",
      bucket: "inventory",
      objectKey: "tasks/task-1.json",
      checksum: {
        algorithm: "sha256",
        value: checksum,
      },
    });

    expect(clientCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endPoint: "storage.test",
        accessKey: "access",
        secretKey: "secret",
      })
    );
    expect(getObjectMock).toHaveBeenCalledWith(
      "inventory",
      "tasks/task-1.json"
    );
    expect(result.buffer.equals(payload)).toBe(true);
  });

  it("бросает ошибку при несоответствии контрольной суммы", async () => {
    const payload = Buffer.from("invalid", "utf8");
    getObjectMock.mockResolvedValue(Readable.from([payload]));

    const storage = new InventoryObjectStorage({
      endpoint: "https://storage.test:9000",
      accessKey: "access",
      secretKey: "secret",
      bucket: "inventory",
    });

    await expect(
      storage.download({
        provider: "s3",
        bucket: "inventory",
        objectKey: "tasks/task-2.json",
        checksum: {
          algorithm: "sha256",
          value: "different",
        },
      })
    ).rejects.toThrow(
      "Payload checksum mismatch for object tasks/task-2.json"
    );
  });
});
