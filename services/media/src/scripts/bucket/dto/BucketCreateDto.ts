import type { UserError } from "../../file/dto/shared.js";

export interface BucketCreateParams {
  readonly bucketName: string;
  readonly region?: string;
  readonly status?: string;
  readonly priority?: number;
  readonly endpointUrl?: string | null;
}

export interface BucketCreateResult {
  bucket: { id: string } | null;
  userErrors: UserError[];
}
