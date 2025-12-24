import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  GetResourcesParams,
  GetResourcesResult,
} from "@shopana/shared-kernel";

/**
 * Returns the list of resources and actions exposed by the store service.
 * Used by IAM service for resource discovery (ListResources action).
 */
export class GetResourcesScript extends BaseScript<
  GetResourcesParams,
  GetResourcesResult
> {
  protected async execute(_params: GetResourcesParams): Promise<GetResourcesResult> {
    return {
      service: "store",
      displayName: "Store",
      resources: [
        {
          name: "store",
          displayName: "Store Settings",
          description: "General store configuration",
          actions: [
            { name: "read", displayName: "View", description: "View store settings" },
            { name: "update", displayName: "Edit", description: "Edit store settings" },
            { name: "delete", displayName: "Delete", description: "Delete the store" },
          ],
        },
        {
          name: "store.team",
          displayName: "Team",
          description: "Team member management",
          actions: [
            { name: "read", displayName: "View", description: "View team members" },
            { name: "invite", displayName: "Invite", description: "Invite new team members" },
            { name: "update", displayName: "Edit", description: "Edit team member roles" },
            { name: "remove", displayName: "Remove", description: "Remove team members" },
          ],
        },
        {
          name: "store.billing",
          displayName: "Billing",
          description: "Billing and subscription management",
          actions: [
            { name: "read", displayName: "View", description: "View billing information" },
            { name: "update", displayName: "Edit", description: "Update billing settings" },
          ],
        },
        {
          name: "store.apiKey",
          displayName: "API Keys",
          description: "API key management",
          actions: [
            { name: "read", displayName: "View", description: "View API keys" },
            { name: "create", displayName: "Create", description: "Create new API keys" },
            { name: "revoke", displayName: "Revoke", description: "Revoke API keys" },
          ],
        },
      ],
    };
  }

  protected handleError(_error: unknown): GetResourcesResult {
    return {
      service: "store",
      displayName: "Store",
      resources: [],
    };
  }
}
