import { DBOS } from "@shopana/workflows";
import { BaseWorkflow, type WorkflowServices } from "./BaseWorkflow.js";
import { classifyError, MissingMetadataError } from "../utils/classifyError.js";
import { S3Client } from "../infrastructure/S3Client.js";

interface Dependencies extends WorkflowServices {
  s3Client: S3Client;
}

export class FileHardDeleteWorkflow extends BaseWorkflow {
  private readonly s3Client: S3Client;

  constructor(name: string, deps: Dependencies) {
    super(name, { kernel: deps.kernel });
    this.s3Client = deps.s3Client;
  }

  @DBOS.workflow()
  async run(fileId: string): Promise<void> {
    const logger = DBOS.logger;
    const fileRepo = this.repository.file;
    const s3ObjectRepo = this.repository.s3Object;
    const bucketRepo = this.repository.bucket;

    const file = await fileRepo.findAnyById(fileId);
    if (!file) {
      logger.debug(`File ${fileId} not found, skipping`);
      return;
    }
    if (file.deletionState !== "SOFT_DELETED") {
      logger.debug(
        `File ${fileId} not in SOFT_DELETED (state=${file.deletionState}), skipping`
      );
      return;
    }
    if (file.deletionErrorCode === "FATAL") {
      logger.debug(
        `File ${fileId} has FATAL error, admin must clear first via fileClearError`
      );
      return;
    }

    const lockResult = await fileRepo.markDeletingReturningStartedAt(fileId);
    if (!lockResult) {
      logger.debug(`markDeleting skipped: file ${fileId} not in SOFT_DELETED`);
      return;
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

      const isLockValid = await fileRepo.isDeletionLockValid(fileId, startedAt);
      if (!isLockValid) {
        const current = await fileRepo.findAnyById(fileId);
        const reason = !current
          ? "row_missing"
          : current.deletionState !== "DELETING"
            ? `state_changed:${current.deletionState}`
            : "startedAt_mismatch";
        logger.info(
          { fileId, reason },
          "Lock lost before S3 delete, aborting safely"
        );
        return;
      }

      if (bucketName && objectKey) {
        await this.s3Client.deleteObject({
          bucket: bucketName,
          key: objectKey,
        });
      }

      const deleted = await fileRepo.hardDeleteIfDeleting(fileId);
      if (!deleted) {
        logger.info(
          `hardDelete skipped: file ${fileId} no longer in DELETING`
        );
      }
    } catch (error: unknown) {
      const errorCode = classifyError(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await fileRepo.markErrorAndRollback(fileId, errorCode, errorMessage);
      throw error;
    }
  }
}
