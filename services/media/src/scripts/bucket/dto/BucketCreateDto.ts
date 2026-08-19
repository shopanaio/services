import { z } from "zod";
import type { UserError } from "../../file/dto/shared.js";

export const bucketCreateSchema = z.object({
  bucketName: z.string().trim().min(1, "bucketName is required").max(255),
  region: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  endpointUrl: z.string().trim().max(2048).optional(),
});

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
