import { DBOS } from "@shopana/workflows";
import { BaseWorkflow } from "./BaseWorkflow.js";
import { OrganizationCreateScript } from "../scripts/organization/OrganizationCreateScript.js";
import type {
  OrganizationCreateParams,
  OrganizationCreateResult,
} from "../scripts/organization/dto/OrganizationCreateDto.js";

/**
 * Durable workflow for organization creation.
 *
 * Ensures that:
 * 1. Organization is created in DB (transactional)
 * 2. Media asset group is created ONLY after successful DB commit
 *
 * This prevents orphan asset groups if the organization creation fails.
 */
export class OrganizationCreateWorkflow extends BaseWorkflow {
  /**
   * Main workflow - orchestrates organization creation
   */
  @DBOS.workflow()
  async run(input: OrganizationCreateParams): Promise<OrganizationCreateResult> {
    // Step 1: Create organization in database (transactional)
    const result = await this.createOrganization(input);

    // If there are user errors, return early (no media asset group needed)
    if (result.userErrors.length > 0 || !result.organization) {
      return result;
    }

    // Step 2: Create media asset group (only after successful DB commit)
    await this.createMediaAssetGroup(result.organization.id);

    return result;
  }

  /**
   * Step: Create organization in database
   */
  @DBOS.step()
  async createOrganization(
    input: OrganizationCreateParams
  ): Promise<OrganizationCreateResult> {
    return this.kernel.runScript(OrganizationCreateScript, input);
  }

  /**
   * Step: Create media asset group for organization
   * Called only after organization is successfully created and committed
   */
  @DBOS.step()
  async createMediaAssetGroup(organizationId: string): Promise<void> {
    try {
      await this.broker.call("media.createAssetGroup", {
        ownerType: "organization",
        ownerId: organizationId,
      });

      this.logger.info(
        { organizationId },
        "Created media asset group for organization"
      );
    } catch (error) {
      // Log but don't fail the workflow - asset group creation is best-effort
      this.logger.warn(
        { organizationId, error },
        "Failed to create media asset group for organization"
      );
    }
  }
}
