import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { AssetGroupRepository } from "./AssetGroupRepository";
import { BucketRepository } from "./BucketRepository";
import { FileRepository } from "./FileRepository";
import { S3ObjectRepository } from "./S3ObjectRepository";
import { ExternalMediaRepository } from "./ExternalMediaRepository";
import { UploadSessionRepository } from "./UploadSessionRepository";
import { BucketRotationLogRepository } from "./BucketRotationLogRepository";

export interface RepositoryConfig {
  db: Database;
}

/**
 * Repository aggregator for media service.
 */
export class Repository {
  public readonly assetGroup: AssetGroupRepository;
  public readonly bucket: BucketRepository;
  public readonly file: FileRepository;
  public readonly s3Object: S3ObjectRepository;
  public readonly externalMedia: ExternalMediaRepository;
  public readonly uploadSession: UploadSessionRepository;
  public readonly bucketRotationLog: BucketRotationLogRepository;
  public readonly txManager: TransactionManager<Database>;

  private constructor(
    assetGroup: AssetGroupRepository,
    bucket: BucketRepository,
    file: FileRepository,
    s3Object: S3ObjectRepository,
    externalMedia: ExternalMediaRepository,
    uploadSession: UploadSessionRepository,
    bucketRotationLog: BucketRotationLogRepository,
    txManager: TransactionManager<Database>
  ) {
    this.assetGroup = assetGroup;
    this.bucket = bucket;
    this.file = file;
    this.s3Object = s3Object;
    this.externalMedia = externalMedia;
    this.uploadSession = uploadSession;
    this.bucketRotationLog = bucketRotationLog;
    this.txManager = txManager;
  }

  /**
   * Create Repository with database instance
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;

    // Create transaction manager
    const txManager = new TransactionManager(db);

    // Create repositories
    const assetGroup = new AssetGroupRepository(db);
    const bucket = new BucketRepository(db);
    const file = new FileRepository(db);
    const s3Object = new S3ObjectRepository(db);
    const externalMedia = new ExternalMediaRepository(db);
    const uploadSession = new UploadSessionRepository(db);
    const bucketRotationLog = new BucketRotationLogRepository(db);

    return new Repository(
      assetGroup,
      bucket,
      file,
      s3Object,
      externalMedia,
      uploadSession,
      bucketRotationLog,
      txManager
    );
  }
}
