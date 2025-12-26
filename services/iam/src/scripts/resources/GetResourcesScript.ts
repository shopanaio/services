import type {
  GetResourcesParams,
  GetResourcesResult,
} from "@shopana/shared-kernel";
import { IAM_SERVICE_RESOURCES } from "../../constants/rbac.js";

/**
 * Returns the list of resources and actions exposed by the IAM service.
 * Used for resource discovery by ResourceAggregator.
 */
export async function getResources(_params?: GetResourcesParams): Promise<GetResourcesResult> {
  return IAM_SERVICE_RESOURCES;
}

export type { GetResourcesParams, GetResourcesResult };
