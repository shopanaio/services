import { Client as MinioClient } from "minio";
import { config } from "../../config.js";

let clientInstance: MinioClient | null = null;

/**
 * Creates or returns a singleton MinIO/S3 client configured from config.
 * MinIO client is compatible with any S3-compatible storage.
 */
export function getS3Client(): MinioClient {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = createMinioClient();
  return clientInstance;
}

/**
 * Creates a new MinIO client (for cases where singleton is not desired)
 */
export function createMinioClient(): MinioClient {
  const { endpoint, accessKey, secretKey, region, pathStyle } = config.storage;

  // Parse endpoint URL
  let endpointHost: string;
  let endpointPort: number | undefined;
  let useSSL: boolean;

  try {
    const url = new URL(endpoint);
    endpointHost = url.hostname;
    endpointPort = url.port ? parseInt(url.port, 10) : undefined;
    useSSL = url.protocol === "https:";
  } catch {
    // Fallback for non-URL format
    endpointHost = endpoint;
    useSSL = true;
  }

  return new MinioClient({
    endPoint: endpointHost,
    port: endpointPort,
    useSSL,
    accessKey,
    secretKey,
    region: region ?? "us-east-1",
    pathStyle: pathStyle ?? false,
  });
}

/**
 * Gets the configured bucket name
 */
export function getBucketName(): string {
  return config.storage.bucket;
}

/**
 * Ensures the configured S3 bucket exists, creates it if not.
 * Returns true if bucket was created, false if it already existed.
 */
export async function ensureBucketExists(): Promise<boolean> {
  const client = getS3Client();
  const bucketName = getBucketName();
  const region = config.storage.region ?? "us-east-1";

  try {
    const exists = await client.bucketExists(bucketName);
    if (exists) {
      return false;
    }

    await client.makeBucket(bucketName, region);
    return true;
  } catch (error) {
    // If bucket already exists (race condition), that's fine
    if ((error as any)?.code === "BucketAlreadyOwnedByYou") {
      return false;
    }
    throw error;
  }
}

/**
 * Builds the public URL for an S3 object
 */
export function buildPublicUrl(objectKey: string): string {
  const { endpoint, bucket, pathStyle } = config.storage;
  const baseEndpoint = endpoint.replace(/\/$/, "");

  if (pathStyle) {
    // Path-style: https://endpoint/bucket/key
    return `${baseEndpoint}/${bucket}/${objectKey}`;
  } else {
    // Virtual-hosted style: https://bucket.endpoint/key
    try {
      const url = new URL(baseEndpoint);
      return `${url.protocol}//${bucket}.${url.host}/${objectKey}`;
    } catch {
      // Fallback to path-style if URL parsing fails
      return `${baseEndpoint}/${bucket}/${objectKey}`;
    }
  }
}

/**
 * Generates a presigned URL for uploading an object to S3
 * @param objectKey - The key (path) where the object will be stored
 * @param expirySeconds - URL expiry time in seconds (default: 3600 = 1 hour)
 * @returns Presigned PUT URL
 */
export async function getPresignedPutUrl(
  objectKey: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getS3Client();
  const bucketName = getBucketName();

  return client.presignedPutObject(bucketName, objectKey, expirySeconds);
}
