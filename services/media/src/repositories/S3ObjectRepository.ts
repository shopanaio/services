import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { s3Objects, type S3Object, type NewS3Object } from "./models";

// ---- Types ----

export interface CreateS3ObjectInput {
  fileId: string;
  bucketId: string;
  objectKey: string;
  etag?: string | null;
  storageClass?: string;
}

export interface UpdateS3ObjectInput {
  etag?: string | null;
  storageClass?: string;
}

// ---- Repository ----

export class S3ObjectRepository {
  constructor(private readonly db: Database) {}

  /**
   * Find S3 object data by file ID
   */
  async findByFileId(fileId: string): Promise<S3Object | null> {
    const result = await this.db
      .select()
      .from(s3Objects)
      .where(eq(s3Objects.fileId, fileId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find S3 objects by multiple file IDs (batch load for DataLoader)
   */
  async findByFileIds(fileIds: string[]): Promise<Map<string, S3Object>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const result = await this.db
      .select()
      .from(s3Objects)
      .where(inArray(s3Objects.fileId, fileIds));

    const map = new Map<string, S3Object>();
    for (const obj of result) {
      map.set(obj.fileId, obj);
    }

    return map;
  }

  /**
   * Create a new S3 object record
   */
  async create(assetGroupId: string, data: CreateS3ObjectInput): Promise<S3Object> {
    const newS3Object: NewS3Object = {
      fileId: data.fileId,
      assetGroupId,
      bucketId: data.bucketId,
      objectKey: data.objectKey,
      etag: data.etag ?? null,
      storageClass: data.storageClass ?? "STANDARD",
    };

    const result = await this.db.insert(s3Objects).values(newS3Object).returning();

    return result[0];
  }

  /**
   * Update an existing S3 object record
   */
  async update(fileId: string, data: UpdateS3ObjectInput): Promise<S3Object | null> {
    const updateData: Partial<NewS3Object> = {};

    if (data.etag !== undefined) {
      updateData.etag = data.etag;
    }
    if (data.storageClass !== undefined) {
      updateData.storageClass = data.storageClass;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findByFileId(fileId);
    }

    const result = await this.db
      .update(s3Objects)
      .set(updateData)
      .where(eq(s3Objects.fileId, fileId))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Delete an S3 object record
   */
  async delete(fileId: string): Promise<void> {
    await this.db
      .delete(s3Objects)
      .where(eq(s3Objects.fileId, fileId));
  }

  /**
   * Find S3 object by bucket and object key
   */
  async findByObjectKey(bucketId: string, objectKey: string): Promise<S3Object | null> {
    const result = await this.db
      .select()
      .from(s3Objects)
      .where(
        and(
          eq(s3Objects.bucketId, bucketId),
          eq(s3Objects.objectKey, objectKey)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Check if an S3 object exists
   */
  async exists(fileId: string): Promise<boolean> {
    const result = await this.db
      .select({ fileId: s3Objects.fileId })
      .from(s3Objects)
      .where(eq(s3Objects.fileId, fileId))
      .limit(1);

    return result.length > 0;
  }
}
