import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  GetResourcesParams,
  GetResourcesResult,
} from "./dto/GetResourcesDto.js";

/**
 * Returns the list of resources and actions exposed by the project service.
 * Used by IAM service for resource discovery (ListResources action).
 */
export class GetResourcesScript extends BaseScript<
  GetResourcesParams,
  GetResourcesResult
> {
  protected async execute(_params: GetResourcesParams): Promise<GetResourcesResult> {
    return {
      service: "project",
      resources: [
        {
          name: "project",
          actions: ["read", "write", "delete"],
        },
        {
          name: "project.settings",
          actions: ["read", "write"],
        },
        {
          name: "project.billing",
          actions: ["read", "write"],
        },
        {
          name: "project.team",
          actions: ["read", "write", "invite", "remove"],
        },
        {
          name: "project.apiKey",
          actions: ["read", "create", "revoke"],
        },
      ],
    };
  }

  protected handleError(_error: unknown): GetResourcesResult {
    // Even on error, return empty resources rather than throwing
    // This allows IAM to continue aggregating from other services
    return {
      service: "project",
      resources: [],
    };
  }
}
