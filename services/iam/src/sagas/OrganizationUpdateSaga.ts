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
import type {
  OrganizationUpdateParams,
  OrganizationUpdateResult,
} from "../scripts/organization/dto/OrganizationUpdateDto.js";
import { OrganizationUpdateScript } from "../scripts/organization/OrganizationUpdateScript.js";

export interface OrganizationUpdateSagaInput extends OrganizationUpdateParams {
  previousLogoId?: string | null;
  nextLogoId?: string | null;
}

export type { OrganizationUpdateResult };

/**
 * Saga for organization update.
 *
 * Steps:
 * 1. Update organization in database
 * 2. Sync logo back-refs (link new, unlink old)
 */
@Injectable()
export class OrganizationUpdateSaga extends BrokerSaga<
  OrganizationUpdateSagaInput,
  OrganizationUpdateResult
> {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("organizationUpdate")
  async run(input: OrganizationUpdateSagaInput): Promise<OrganizationUpdateResult> {
    const { previousLogoId, nextLogoId, ...updateParams } = input;

    // Step 1: Update organization in database
    const result = await this.updateOrganization(updateParams);

    if (result.userErrors.length > 0 || !result.organization) {
      return result;
    }

    // Step 2: Sync logo back-refs
    if (previousLogoId !== nextLogoId) {
      await this.syncLogoBackRefs(input.organizationId, previousLogoId ?? null, nextLogoId ?? null);
    }

    return result;
  }

  @SagaStep()
  private async updateOrganization(
    input: OrganizationUpdateParams,
  ): Promise<OrganizationUpdateResult> {
    return this.kernel.runScript(OrganizationUpdateScript, input);
  }

  @SagaStep()
  private async syncLogoBackRefs(
    organizationId: string,
    previousLogoId: string | null,
    nextLogoId: string | null,
  ): Promise<void> {
    const entityRef = {
      service: "iam",
      entityType: "organization",
      entityId: organizationId,
    };
    const role = "logo";

    if (nextLogoId) {
      try {
        await this.broker.call<Media.FileLinkResult, Media.FileLinkParams>(
          "media.fileLink",
          { fileId: nextLogoId, entityRef, role },
        );
      } catch (error) {
        this.logger.warn({ organizationId, fileId: nextLogoId, error }, "Failed to link logo");
      }
    }

    if (previousLogoId) {
      try {
        await this.broker.call<Media.FileUnlinkResult, Media.FileUnlinkParams>(
          "media.fileUnlink",
          { fileId: previousLogoId, entityRef, role },
        );
      } catch (error) {
        this.logger.warn({ organizationId, fileId: previousLogoId, error }, "Failed to unlink logo");
      }
    }
  }
}
