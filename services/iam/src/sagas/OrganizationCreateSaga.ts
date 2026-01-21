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
import { OrganizationCreateScript } from "../scripts/organization/OrganizationCreateScript.js";
import type {
  OrganizationCreateParams,
  OrganizationCreateResult,
} from "../scripts/organization/dto/OrganizationCreateDto.js";

export type { OrganizationCreateParams, OrganizationCreateResult };

/**
 * Saga for organization creation with compensation support.
 *
 * Steps:
 * 1. Create organization in database (via script - handles roles, policies, membership)
 * 2. Create media asset group (non-critical)
 */
@Injectable()
export class OrganizationCreateSaga extends BrokerSaga<
  OrganizationCreateParams,
  OrganizationCreateResult
> {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("organizationCreate")
  async run(input: OrganizationCreateParams): Promise<OrganizationCreateResult> {
    // Step 1: Create organization in database
    const result = await this.createOrganization(input);

    if (result.userErrors.length > 0 || !result.organization) {
      return result;
    }

    // Step 2: Create media asset group
    await this.createMediaAssetGroup(result.organization.id);

    return result;
  }

  @SagaStep()
  private async createOrganization(
    input: OrganizationCreateParams,
  ): Promise<OrganizationCreateResult> {
    return this.kernel.runScript(OrganizationCreateScript, input);
  }

  @SagaStep({ critical: false })
  private async createMediaAssetGroup(organizationId: string): Promise<void> {
    const result = await this.broker.call<
      Media.CreateAssetGroupResult,
      Media.CreateAssetGroupParams
    >("media.createAssetGroup", {
      ownerType: "organization",
      ownerId: organizationId,
    });

    if (result.userErrors.length > 0) {
      const message = result.userErrors[0]?.message ?? "Media asset group failed";
      this.logger.warn({ organizationId, message }, "Failed to create media asset group");
      throw new Error(message);
    }

    this.logger.debug({ organizationId }, "Created media asset group for organization");
  }

  async compensateCreateOrganization(
    _input: OrganizationCreateParams,
    result: OrganizationCreateResult,
  ): Promise<void> {
    if (!result.organization) return;

    await this.kernel.repository.organization.delete(result.organization.id);
    this.logger.log(
      { organizationId: result.organization.id },
      "Compensated: deleted organization",
    );
  }

  async compensateCreateMediaAssetGroup(organizationId: string): Promise<void> {
    try {
      await this.broker.call<
        Media.DeleteAssetGroupResult,
        Media.DeleteAssetGroupParams
      >("media.deleteAssetGroup", {
        ownerType: "organization",
        ownerId: organizationId,
      });
      this.logger.log(
        { organizationId },
        "Compensated: deleted media asset group",
      );
    } catch (error) {
      this.logger.warn(
        { organizationId, error },
        "Failed to compensate media asset group",
      );
    }
  }
}
