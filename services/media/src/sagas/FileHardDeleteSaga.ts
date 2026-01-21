import { Inject, Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { classifyError, MissingMetadataError } from "../utils/classifyError.js";
import { S3Client, S3_CLIENT } from "../infrastructure/S3Client.js";

export interface FileHardDeleteOutput {
  deleted: boolean;
  skipped?: string;
}

@Injectable()
export class FileHardDeleteSaga extends BrokerSaga<string, FileHardDeleteOutput> {
  constructor(
    @InjectBroker("media") broker: ServiceBroker,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client
  ) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get repository() {
    return this.kernel.getServices().repository;
  }

  @Saga("fileHardDelete")
  async run(fileId: string): Promise<FileHardDeleteOutput> {
    const fileRepo = this.repository.file;
    const fileDeletionStateRepo = this.repository.fileDeletionState;
    const s3ObjectRepo = this.repository.s3Object;
    const bucketRepo = this.repository.bucket;

    // Get file and its deletion state
    const file = await fileRepo.findAnyById(fileId);
    if (!file) {
      this.logger.debug(`File ${fileId} not found, skipping`);
      return { deleted: false, skipped: "file_not_found" };
    }

    const deletionState = await fileDeletionStateRepo.findByFileId(fileId);
    if (!deletionState) {
      this.logger.debug(`File ${fileId} has no deletion state, skipping`);
      return { deleted: false, skipped: "no_deletion_state" };
    }

    if (deletionState.deletionState !== "SOFT_DELETED") {
      this.logger.debug(
        `File ${fileId} not in SOFT_DELETED (state=${deletionState.deletionState}), skipping`
      );
      return { deleted: false, skipped: `wrong_state:${deletionState.deletionState}` };
    }
    if (deletionState.deletionErrorCode === "FATAL") {
      this.logger.debug(
        `File ${fileId} has FATAL error, admin must clear first via fileClearError`
      );
      return { deleted: false, skipped: "fatal_error" };
    }

    // Lock: transition SOFT_DELETED -> DELETING
    const lockResult =
      await fileDeletionStateRepo.markDeletingReturningStartedAt(fileId);
    if (!lockResult) {
      this.logger.debug(`markDeleting skipped: file ${fileId} not in SOFT_DELETED`);
      return { deleted: false, skipped: "lock_failed" };
    }

    const { startedAt } = lockResult;

    try {
      let bucketName: string | null = null;
      let objectKey: string | null = null;

      if (file.provider === "S3") {
        const s3Object = await s3ObjectRepo.findByFileId(fileId);
        if (!s3Object) {
          throw new MissingMetadataError(`File ${fileId} has no S3 metadata`);
        }
        const bucket = await bucketRepo.findAnyById(s3Object.bucketId);
        if (!bucket) {
          throw new MissingMetadataError(
            `Bucket ${s3Object.bucketId} not found`
          );
        }

        bucketName = bucket.bucketName;
        objectKey = s3Object.objectKey;
      }

      // Verify lock is still valid before S3 delete
      const isLockValid = await fileDeletionStateRepo.isDeletionLockValid(
        fileId,
        startedAt
      );
      if (!isLockValid) {
        const currentState = await fileDeletionStateRepo.findByFileId(fileId);
        const reason = !currentState
          ? "row_missing"
          : currentState.deletionState !== "DELETING"
            ? `state_changed:${currentState.deletionState}`
            : "startedAt_mismatch";
        this.logger.log(
          `Lock lost before S3 delete, aborting safely: fileId=${fileId}, reason=${reason}`
        );
        return { deleted: false, skipped: `lock_lost:${reason}` };
      }

      // Delete from S3
      if (bucketName && objectKey) {
        await this.deleteFromS3(bucketName, objectKey);
      }

      // Hard delete file row (cascades to file_deletion_states via FK)
      const deleted = await fileRepo.hardDelete(fileId);
      if (!deleted) {
        this.logger.log(`hardDelete skipped: file ${fileId} already deleted`);
      }

      await this.startCleanupSaga(fileId);

      return { deleted: true };
    } catch (error: unknown) {
      // Rollback: DELETING -> SOFT_DELETED with error
      const errorCode = classifyError(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await fileDeletionStateRepo.markErrorAndRollback(
        fileId,
        errorCode,
        errorMessage
      );
      throw error;
    }
  }

  @SagaStep()
  private async deleteFromS3(bucket: string, key: string): Promise<void> {
    await this.s3Client.deleteObject({ bucket, key });
  }

  @SagaStep({ critical: false })
  private async startCleanupSaga(fileId: string): Promise<void> {
    await this.broker.runSaga(
      "fileDeleteCleanup",
      fileId,
      {
        source: "workflow",
        workflowId: FileHardDeleteSaga.workflowID(fileId),
        stepId: "startCleanup",
      }
    );
  }

  static workflowID(fileId: string): string {
    return `file:hardDelete:${fileId}`;
  }
}
