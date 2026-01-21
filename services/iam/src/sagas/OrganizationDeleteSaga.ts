import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import { OrganizationDeleteScript } from "../scripts/organization/OrganizationDeleteScript.js";
import type {
  OrganizationDeleteParams,
  OrganizationDeleteResult,
} from "../scripts/organization/dto/OrganizationDeleteDto.js";

export type { OrganizationDeleteParams, OrganizationDeleteResult };

/**
 * Saga for organization deletion.
 *
 * Steps:
 * 1. Delete organization from database
 * 2. Delete media asset group
 * 3. Unlink back-refs
 */
@Injectable()
export class OrganizationDeleteSaga extends BrokerSaga<
  OrganizationDeleteParams,
  OrganizationDeleteResult
> {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("organizationDelete")
  async run(input: OrganizationDeleteParams): Promise<OrganizationDeleteResult> {
    // Step 1: Delete organization from database
    const result = await this.deleteOrganization(input);

    if (result.userErrors.length > 0 || !result.deletedOrganizationId) {
      return result;
    }

    // Step 2: Delete media asset group
    await this.deleteMediaAssetGroup(result.deletedOrganizationId);

    // Step 3: Unlink back-refs
    await this.unlinkBackRefs(result.deletedOrganizationId);

    return result;
  }

  @SagaStep()
  private async deleteOrganization(
    input: OrganizationDeleteParams,
  ): Promise<OrganizationDeleteResult> {
    return this.kernel.runScript(OrganizationDeleteScript, input);
  }

  @SagaStep()
  private async deleteMediaAssetGroup(organizationId: string): Promise<void> {
    try {
      await this.broker.call<Media.DeleteAssetGroupResult, Media.DeleteAssetGroupParams>(
        "media.deleteAssetGroup",
        { ownerType: "organization", ownerId: organizationId },
      );
      this.logger.debug({ organizationId }, "Deleted media asset group for organization");
    } catch (error) {
      this.logger.warn({ organizationId, error }, "Failed to delete media asset group");
    }
  }

  @SagaStep()
  private async unlinkBackRefs(organizationId: string): Promise<void> {
    try {
      await this.broker.call<Media.EntityDeletedResult, Media.EntityDeletedParams>(
        "media.entityDeleted",
        {
          entityRef: {
            service: "iam",
            entityType: "organization",
            entityId: organizationId,
          },
        },
      );
      this.logger.debug({ organizationId }, "Unlinked media back-refs for organization");
    } catch (error) {
      this.logger.warn({ organizationId, error }, "Failed to unlink media back-refs");
    }
  }
}
