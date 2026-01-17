import type { Client as MinioClient } from "minio";
import { getS3Client } from "./s3/index.js";

export interface DeleteObjectParams {
  bucket: string;
  key: string;
}

export class S3Client {
  private readonly client: MinioClient;

  constructor(client?: MinioClient) {
    this.client = client ?? getS3Client();
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    try {
      await this.client.removeObject(params.bucket, params.key);
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { Code?: string; code?: string; name?: string }).Code ??
    (error as { Code?: string; code?: string; name?: string }).code ??
    (error as { Code?: string; code?: string; name?: string }).name;

  return code === "NoSuchKey" || code === "NotFound" || code === "NoSuchObject";
}
