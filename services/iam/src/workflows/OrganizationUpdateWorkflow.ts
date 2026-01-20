import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  Step,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type {
  OrganizationUpdateParams,
  OrganizationUpdateResult,
} from "../scripts/organization/dto/OrganizationUpdateDto.js";
import { OrganizationUpdateScript } from "../scripts/organization/OrganizationUpdateScript.js";

export interface OrganizationUpdateWorkflowInput extends OrganizationUpdateParams {
  previousLogoId?: string | null;
  nextLogoId?: string | null;
}

/**
 * Durable workflow for organization update.
 *
 * Steps:
 * 1. Update organization in database
 * 2. Sync logo back-refs (link new, unlink old)
 */
@Injectable()
export class OrganizationUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("organizationUpdate")
  async run(input: OrganizationUpdateWorkflowInput): Promise<OrganizationUpdateResult> {
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

  @Step()
  async updateOrganization(input: OrganizationUpdateParams): Promise<OrganizationUpdateResult> {
    return this.kernel.runScript(OrganizationUpdateScript, input);
  }

  @Step()
  async syncLogoBackRefs(
    organizationId: string,
    previousLogoId: string | null,
    nextLogoId: string | null
  ): Promise<void> {
    const entityRef = {
      service: "iam",
      entityType: "organization",
      entityId: organizationId,
    };
    const role = "logo";

    if (nextLogoId) {
      try {
        await this.broker.call("media.fileLink", { fileId: nextLogoId, entityRef, role });
      } catch (error) {
        this.logger.warn({ organizationId, fileId: nextLogoId, error }, "Failed to link logo");
      }
    }

    if (previousLogoId) {
      try {
        await this.broker.call("media.fileUnlink", { fileId: previousLogoId, entityRef, role });
      } catch (error) {
        this.logger.warn({ organizationId, fileId: previousLogoId, error }, "Failed to unlink logo");
      }
    }
  }
}
