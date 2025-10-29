import { Client } from "minio";
import type { TildaStorageConfig } from "./config";

export interface UploadedObjectDetails {
  objectKey: string;
  etag?: string;
}

export interface UploadOptions {
  contentType: string;
  checksumSha256?: string;
}

export class TildaObjectStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly baseEndpoint: string;
  private readonly region?: string;
  private readonly prefix?: string;

  public constructor(private readonly config: TildaStorageConfig) {
    const endpointUrl = new URL(config.endpoint);
    const useSSL = endpointUrl.protocol === "https:";
    const port = endpointUrl.port
      ? Number.parseInt(endpointUrl.port, 10)
      : undefined;

    this.client = new Client({
      endPoint: endpointUrl.hostname,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      sessionToken: config.sessionToken,
      port,
      useSSL,
      region: config.region,
      pathStyle: config.pathStyle ?? false,
    });

    this.bucket = config.bucket;
    this.region = config.region;
    this.baseEndpoint = this.normalizeEndpoint(config.endpoint);
    this.prefix = config.prefix
      ? this.stripSlashes(config.prefix)
      : undefined;
  }

  public getBucket(): string {
    return this.bucket;
  }

  public getEndpoint(): string {
    return this.baseEndpoint;
  }

  public getRegion(): string | undefined {
    return this.region;
  }

  public buildObjectKey(taskId: string, issuedAtIso: string): string {
    const timestamp = this.safeParseDate(issuedAtIso);
    const segments = [
      String(timestamp.getUTCFullYear()),
      this.pad(timestamp.getUTCMonth() + 1),
      this.pad(timestamp.getUTCDate()),
      `${taskId}.json`,
    ];
    const objectKey = segments.join("/");
    return this.applyPrefix(objectKey);
  }

  public async uploadJson(
    objectKey: string,
    payload: Buffer,
    options: UploadOptions
  ): Promise<UploadedObjectDetails> {
    const metadata: Record<string, string> = {
      "Content-Type": options.contentType,
    };

    if (options.checksumSha256) {
      metadata["x-amz-meta-checksum-sha256"] = options.checksumSha256;
    }

    const etag = await this.client.putObject(
      this.bucket,
      objectKey,
      payload,
      payload.byteLength,
      metadata
    );

    return { objectKey, etag: typeof etag === "string" ? etag : undefined };
  }

  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/\/+$/, "");
  }

  private stripSlashes(value: string): string {
    return value.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  private applyPrefix(objectKey: string): string {
    if (!this.prefix) {
      return objectKey;
    }
    return `${this.prefix}/${this.stripSlashes(objectKey)}`;
  }

  private safeParseDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }

  private pad(input: number): string {
    return input.toString().padStart(2, "0");
  }
}
