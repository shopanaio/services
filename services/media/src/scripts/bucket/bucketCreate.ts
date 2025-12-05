import { getContext } from "../../context/index.js";
import type { TransactionScript } from "../../kernel/types.js";

export interface BucketCreateParams {
  readonly bucketName: string;
  readonly region?: string;
  readonly status?: string;
  readonly priority?: number;
  readonly endpointUrl?: string | null;
}

export interface BucketCreateResult {
  bucket?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const bucketCreate: TransactionScript<
  BucketCreateParams,
  BucketCreateResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "bucketCreate: starting");

    const bucket = await repository.bucket.create(projectId, {
      bucketName: params.bucketName,
      region: params.region,
      status: params.status,
      priority: params.priority,
      endpointUrl: params.endpointUrl,
    });

    logger.info(
      { bucketId: bucket.id },
      "bucketCreate: completed successfully"
    );

    return {
      bucket: { id: bucket.id },
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "bucketCreate failed");
    return {
      bucket: undefined,
      userErrors: [
        { message: "Failed to create bucket", code: "INTERNAL_ERROR" },
      ],
    };
  }
};
