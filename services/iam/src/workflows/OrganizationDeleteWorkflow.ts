import { DBOS } from "@shopana/workflows";
import { BaseWorkflow } from "./BaseWorkflow.js";
import { OrganizationDeleteScript } from "../scripts/organization/OrganizationDeleteScript.js";
import type {
  OrganizationDeleteParams,
  OrganizationDeleteResult,
} from "../scripts/organization/dto/OrganizationDeleteDto.js";

/**
 * Durable workflow for organization deletion.
 *
 * Ensures that:
 * 1. Organization is deleted in DB (transactional)
 * 2. Media asset group is deleted ONLY after successful DB commit
 * 3. Back-refs are unlinked ONLY after successful DB commit
 *
 * This prevents orphan state if the organization deletion fails.
 */
export class OrganizationDeleteWorkflow extends BaseWorkflow {
  /**
   * Main workflow - orchestrates organization deletion
   */
  @DBOS.workflow()
  async run(input: OrganizationDeleteParams): Promise<OrganizationDeleteResult> {
    // Step 1: Delete organization in database (transactional)
    const result = await this.deleteOrganization(input);

    // If there are user errors, return early (no cleanup needed)
    if (result.userErrors.length > 0 || !result.deletedOrganizationId) {
      return result;
    }

    // Step 2: Delete media asset group (only after successful DB commit)
    await this.deleteMediaAssetGroup(result.deletedOrganizationId);

    // Step 3: Unlink back-refs (only after successful DB commit)
    await this.unlinkBackRefs(result.deletedOrganizationId);

    return result;
  }

  /**
   * Step: Delete organization in database
   */
  @DBOS.step()
  async deleteOrganization(
    input: OrganizationDeleteParams
  ): Promise<OrganizationDeleteResult> {
    return this.kernel.runScript(OrganizationDeleteScript, input);
  }

  /**
   * Step: Delete media asset group for organization
   * Called only after organization is successfully deleted and committed
   */
  @DBOS.step()
  async deleteMediaAssetGroup(organizationId: string): Promise<void> {
    try {
      await this.broker.call("media.deleteAssetGroup", {
        ownerType: "organization",
        ownerId: organizationId,
      });

      this.logger.info(
        { organizationId },
        "Deleted media asset group for organization"
      );
    } catch (error) {
      this.logger.warn(
        { organizationId, error },
        "Failed to delete media asset group for organization"
      );
    }
  }

  /**
   * Step: Unlink all back-refs for organization
   * Called only after organization is successfully deleted and committed
   */
  @DBOS.step()
  async unlinkBackRefs(organizationId: string): Promise<void> {
    try {
      await this.broker.call("media.entityDeleted", {
        entityRef: {
          service: "iam",
          entityType: "organization",
          entityId: organizationId,
        },
      });

      this.logger.info(
        { organizationId },
        "Unlinked media back-refs for organization"
      );
    } catch (error) {
      this.logger.warn(
        { organizationId, error },
        "Failed to unlink media back-refs for organization"
      );
    }
  }
}
