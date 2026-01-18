import { DBOS } from "@shopana/workflows";
import { BaseWorkflow, type WorkflowServices } from "./BaseWorkflow.js";
import { classifyError, MissingMetadataError } from "../utils/classifyError.js";
import { S3Client } from "../infrastructure/S3Client.js";
import { FileDeleteCleanupWorkflow } from "./FileDeleteCleanupWorkflow.js";

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
    const fileDeletionStateRepo = this.repository.fileDeletionState;
    const s3ObjectRepo = this.repository.s3Object;
    const bucketRepo = this.repository.bucket;

    // Get file and its deletion state
    const file = await fileRepo.findAnyById(fileId);
    if (!file) {
      logger.debug(`File ${fileId} not found, skipping`);
      return;
    }

    const deletionState = await fileDeletionStateRepo.findByFileId(fileId);
    if (!deletionState) {
      logger.debug(`File ${fileId} has no deletion state, skipping`);
      return;
    }

    if (deletionState.deletionState !== "SOFT_DELETED") {
      logger.debug(
        `File ${fileId} not in SOFT_DELETED (state=${deletionState.deletionState}), skipping`
      );
      return;
    }
    if (deletionState.deletionErrorCode === "FATAL") {
      logger.debug(
        `File ${fileId} has FATAL error, admin must clear first via fileClearError`
      );
      return;
    }

    // Lock: transition SOFT_DELETED -> DELETING
    const lockResult =
      await fileDeletionStateRepo.markDeletingReturningStartedAt(fileId);
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
        logger.info(
          `Lock lost before S3 delete, aborting safely: fileId=${fileId}, reason=${reason}`
        );
        return;
      }

      // Delete from S3
      if (bucketName && objectKey) {
        await this.s3Client.deleteObject({
          bucket: bucketName,
          key: objectKey,
        });
      }

      // Hard delete file row (cascades to file_deletion_states via FK)
      const deleted = await fileRepo.hardDelete(fileId);
      if (!deleted) {
        logger.info(`hardDelete skipped: file ${fileId} already deleted`);
      }

      const cleanupWorkflow =
        this.services.workflow.get<FileDeleteCleanupWorkflow>("fileDeleteCleanup");
      await DBOS.startWorkflow(cleanupWorkflow, {
        workflowID: FileDeleteCleanupWorkflow.workflowID(fileId),
      }).run(fileId);
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
}
