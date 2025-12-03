import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database";
import { BucketRepository } from "./BucketRepository";
import { FileRepository } from "./FileRepository";
import { S3ObjectRepository } from "./S3ObjectRepository";
import { ExternalMediaRepository } from "./ExternalMediaRepository";
import { UploadSessionRepository } from "./UploadSessionRepository";
import { BucketRotationLogRepository } from "./BucketRotationLogRepository";

export class Repository {
  public readonly bucket: BucketRepository;
  public readonly file: FileRepository;
  public readonly s3Object: S3ObjectRepository;
  public readonly externalMedia: ExternalMediaRepository;
  public readonly uploadSession: UploadSessionRepository;
  public readonly bucketRotationLog: BucketRotationLogRepository;

  private readonly db: Database;

  constructor(connectionString: string) {
    this.db = initDatabase(connectionString);

    this.bucket = new BucketRepository(this.db);
    this.file = new FileRepository(this.db);
    this.s3Object = new S3ObjectRepository(this.db);
    this.externalMedia = new ExternalMediaRepository(this.db);
    this.uploadSession = new UploadSessionRepository(this.db);
    this.bucketRotationLog = new BucketRotationLogRepository(this.db);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}
