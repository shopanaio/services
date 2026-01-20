import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  Step,
} from "@shopana/shared-kernel";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import { OrganizationCreateScript } from "../scripts/organization/OrganizationCreateScript.js";
import type {
  OrganizationCreateParams,
  OrganizationCreateResult,
} from "../scripts/organization/dto/OrganizationCreateDto.js";

export type { OrganizationCreateParams, OrganizationCreateResult };

/**
 * Durable workflow for organization creation.
 *
 * Steps:
 * 1. Create organization in database
 * 2. Create media asset group
 */
@Injectable()
export class OrganizationCreateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("organizationCreate")
  async run(
    input: OrganizationCreateParams,
  ): Promise<OrganizationCreateResult> {
    // Step 1: Create organization in database
    const result = await this.createOrganization(input);

    if (result.userErrors.length > 0 || !result.organization) {
      return result;
    }

    // Step 2: Create media asset group
    await this.createMediaAssetGroup(result.organization.id);

    return result;
  }

  @Step()
  async createOrganization(
    input: OrganizationCreateParams,
  ): Promise<OrganizationCreateResult> {
    return this.kernel.runScript(OrganizationCreateScript, input);
  }

  @Step()
  async createMediaAssetGroup(organizationId: string): Promise<void> {
    try {
      await this.broker.call<Media.CreateAssetGroupResult, Media.CreateAssetGroupParams>(
        "media.createAssetGroup",
        {
          ownerType: "organization",
          ownerId: organizationId,
        },
      );
      this.logger.debug(
        { organizationId },
        "Created media asset group for organization",
      );
    } catch (error) {
      this.logger.warn(
        { organizationId, error },
        "Failed to create media asset group",
      );
    }
  }
}
