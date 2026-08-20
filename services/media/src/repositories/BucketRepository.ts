import { eq, and, isNull, or } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { assetGroups, buckets, s3Objects, type Bucket, type NewBucket } from "./models";
import type { FileAccessScope } from "./FileRepository";

export interface CreateBucketInput {
  id?: string;
  bucketName: string;
  region?: string;
  status?: string;
  priority?: number;
  endpointUrl?: string | null;
}

export class BucketRepository {
  constructor(private readonly db: Database) {}

  async findById(storeId: string, bucketId: string): Promise<Bucket | null> {
    const result = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.storeId, storeId), eq(buckets.id, bucketId), isNull(buckets.deletedAt)))
      .limit(1);

    return result[0] ?? null;
  }

  async findAnyById(bucketId: string): Promise<Bucket | null> {
    const result = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), isNull(buckets.deletedAt)))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * A bucket is visible when it belongs to the current store or is used by an
   * S3 object in one of the caller's accessible media libraries. This keeps
   * shared/system storage usable without exposing another tenant's buckets.
   */
  async findAccessibleById(bucketId: string, scope: FileAccessScope): Promise<Bucket | null> {
    const accessibleOwner = or(
      and(eq(assetGroups.ownerType, "store"), eq(assetGroups.ownerId, scope.storeId)),
      scope.organizationId
        ? and(
            eq(assetGroups.ownerType, "organization"),
            eq(assetGroups.ownerId, scope.organizationId),
          )
        : undefined,
      scope.userId
        ? and(eq(assetGroups.ownerType, "user_profile"), eq(assetGroups.ownerId, scope.userId))
        : undefined,
    );
    const result = await this.db
      .select({ bucket: buckets })
      .from(buckets)
      .leftJoin(s3Objects, eq(s3Objects.bucketId, buckets.id))
      .leftJoin(assetGroups, eq(assetGroups.id, s3Objects.assetGroupId))
      .where(
        and(
          eq(buckets.id, bucketId),
          isNull(buckets.deletedAt),
          or(eq(buckets.storeId, scope.storeId), accessibleOwner),
        ),
      )
      .limit(1);

    return result[0]?.bucket ?? null;
  }

  async findActive(storeId: string): Promise<Bucket | null> {
    const result = await this.db
      .select()
      .from(buckets)
      .where(
        and(eq(buckets.storeId, storeId), eq(buckets.status, "active"), isNull(buckets.deletedAt)),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(storeId: string, data: CreateBucketInput): Promise<Bucket> {
    const id = data.id ?? crypto.randomUUID();

    const newBucket: NewBucket = {
      id,
      storeId,
      bucketName: data.bucketName,
      region: data.region ?? "us-east-1",
      status: data.status ?? "active",
      priority: data.priority ?? 0,
      endpointUrl: data.endpointUrl ?? null,
    };

    const result = await this.db.insert(buckets).values(newBucket).returning();

    return result[0];
  }

  /**
   * Find bucket by name (global, not per-project).
   */
  async findByBucketName(bucketName: string): Promise<Bucket | null> {
    const result = await this.db
      .select()
      .from(buckets)
      .where(
        and(
          eq(buckets.bucketName, bucketName),
          eq(buckets.status, "active"),
          isNull(buckets.deletedAt),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get the default bucket by name.
   * Bucket must be created at service startup.
   */
  async getDefault(bucketName: string): Promise<Bucket> {
    const bucket = await this.findByBucketName(bucketName);
    if (!bucket) {
      throw new Error(
        `Default bucket not found: ${bucketName}. Ensure it is created at service startup.`,
      );
    }
    return bucket;
  }
}
