import { Client } from "minio";
import { createHash } from "crypto";
import type { InventoryUpdateStorage } from "@shopana/import-plugin-sdk";
import type { Readable } from "node:stream";

export interface InventoryStorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  prefix?: string;
  pathStyle?: boolean;
  sessionToken?: string;
}

export interface DownloadedInventoryPayload {
  buffer: Buffer;
  contentType?: string;
}

export class InventoryObjectStorage {
  private readonly client: Client;
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly region?: string;

  public constructor(private readonly config: InventoryStorageConfig) {
    const endpointUrl = new URL(config.endpoint);
    const useSSL = endpointUrl.protocol === "https:";
    const port = endpointUrl.port
      ? Number.parseInt(endpointUrl.port, 10)
      : undefined;

    this.client = new Client({
      endPoint: endpointUrl.hostname,
      port,
      useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      sessionToken: config.sessionToken,
      region: config.region,
      pathStyle: config.pathStyle ?? false,
    });

    this.endpoint = config.endpoint.replace(/\/+$/, "");
    this.bucket = config.bucket;
    this.region = config.region;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public getBucket(): string {
    return this.bucket;
  }

  public getRegion(): string | undefined {
    return this.region;
  }

  public async download(
    descriptor: InventoryUpdateStorage
  ): Promise<DownloadedInventoryPayload> {
    if (descriptor.provider !== "s3") {
      throw new Error(
        `Unsupported storage provider: ${descriptor.provider}`
      );
    }

    const bucketName = descriptor.bucket;
    const objectKey = descriptor.objectKey;
    const stream = (await this.client.getObject(
      bucketName,
      objectKey
    )) as Readable;
    let buffer: Buffer;

    try {
      buffer = await this.streamToBuffer(stream);
    } finally {
      this.destroyStream(stream);
    }

    if (
      descriptor.checksum &&
      descriptor.checksum.algorithm === "sha256"
    ) {
      const expectedChecksum = descriptor.checksum.value;
      const actualChecksum = createHash("sha256")
        .update(buffer)
        .digest("hex");
      if (expectedChecksum !== actualChecksum) {
        throw new Error(
          `Payload checksum mismatch for object ${objectKey}`
        );
      }
    }

    return {
      buffer,
      contentType: descriptor.contentType,
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      } else if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  private destroyStream(stream: Readable): void {
    if (typeof stream.destroy === "function") {
      stream.destroy();
    }
  }
}
