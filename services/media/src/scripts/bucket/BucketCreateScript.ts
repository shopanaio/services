import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import {
  bucketCreateSchema,
  type BucketCreateParams,
  type BucketCreateResult,
} from "./dto/BucketCreateDto.js";

export class BucketCreateScript extends BaseScript<
  BucketCreateParams,
  BucketCreateResult
> {
  @ZodSchema(bucketCreateSchema)
  protected async execute(params: BucketCreateParams): Promise<BucketCreateResult> {
    const storeId = this.storeId;

    this.logger.info({ params, storeId }, "BucketCreateScript: starting");

    const bucket = await this.repository.bucket.create(storeId, {
      bucketName: params.bucketName,
      region: params.region,
      status: params.status,
      priority: params.priority,
      endpointUrl: params.endpointUrl,
    });

    this.logger.info(
      { bucketId: bucket.id },
      "BucketCreateScript: completed successfully"
    );

    return {
      bucket: { id: bucket.id },
      userErrors: [],
    };
  }

  protected handleError(error: unknown): BucketCreateResult {
    if (error instanceof ValidationError) {
      return { bucket: null, userErrors: toUserErrors(error) };
    }
    return {
      bucket: null,
      userErrors: [
        { message: "Failed to create bucket", code: "INTERNAL_ERROR" },
      ],
    };
  }
}
