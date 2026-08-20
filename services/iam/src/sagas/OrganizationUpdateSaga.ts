import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  Policy,
  RetryableError,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import type {
  OrganizationUpdateParams,
  OrganizationUpdateResult,
} from "../scripts/organization/dto/OrganizationUpdateDto.js";
import { OrganizationUpdateScript } from "../scripts/organization/OrganizationUpdateScript.js";
import { mediaLinkError } from "./mediaLinkError.js";

export interface OrganizationUpdateSagaInput extends OrganizationUpdateParams {
  previousLogoId?: string | null;
  nextLogoId?: string | null;
}

export type { OrganizationUpdateResult };

/**
 * Saga for organization update.
 *
 * Steps:
 * 1. Link and validate the new logo, when provided
 * 2. Update organization in database
 * 3. Unlink the previous logo
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
  @Policy<OrganizationUpdateSagaInput>({
    resource: "org.profile",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: OrganizationUpdateSagaInput): Promise<OrganizationUpdateResult> {
    const { previousLogoId, nextLogoId, ...updateParams } = input;
    const logoChanged = nextLogoId !== undefined && previousLogoId !== nextLogoId;
    let nextLogoLinked = false;

    if (logoChanged && nextLogoId) {
      const linkResult = await this.linkLogoBackRef(input.organizationId, nextLogoId);
      if (!linkResult.success) {
        return {
          organization: null,
          userErrors: [mediaLinkError(linkResult, "logoId")],
        };
      }
      nextLogoLinked = true;
    }

    const result = await this.updateOrganization(updateParams);

    if (result.userErrors.length > 0 || !result.organization) {
      if (nextLogoLinked && nextLogoId) {
        await this.cleanupLogoBackRef(input.organizationId, nextLogoId);
      }
      return result;
    }

    if (logoChanged && previousLogoId) {
      await this.unlinkLogoBackRef(input.organizationId, previousLogoId);
    }

    return result;
  }

  @SagaStep()
  private async updateOrganization(
    input: OrganizationUpdateParams,
  ): Promise<OrganizationUpdateResult> {
    return this.kernel.runScript(OrganizationUpdateScript, input);
  }

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async linkLogoBackRef(
    organizationId: string,
    fileId: string,
  ): Promise<Media.FileLinkResult> {
    const result = await this.linkLogoMediaReference(organizationId, fileId);
    if (result.code === "LINK_FAILED") {
      throw new RetryableError("Unable to attach organization logo media file");
    }
    return result;
  }

  private async compensateLinkLogoBackRef(organizationId: string, fileId: string): Promise<void> {
    await this.unlinkLogoMediaReference(organizationId, fileId);
  }

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async cleanupLogoBackRef(organizationId: string, fileId: string): Promise<void> {
    await this.unlinkLogoMediaReference(organizationId, fileId);
  }

  private async compensateCleanupLogoBackRef(
    organizationId: string,
    fileId: string,
  ): Promise<void> {
    const result = await this.linkLogoMediaReference(organizationId, fileId);
    if (!result.success) {
      throw new RetryableError("Unable to restore organization logo media reference");
    }
  }

  @SagaStep()
  private async unlinkLogoBackRef(organizationId: string, fileId: string): Promise<void> {
    await this.unlinkLogoMediaReference(organizationId, fileId);
  }

  private async unlinkLogoMediaReference(organizationId: string, fileId: string): Promise<void> {
    const result = await this.broker.call<Media.FileUnlinkResult, Media.FileUnlinkParams>(
      "media.fileUnlink",
      {
        fileId,
        entityRef: {
          service: "iam",
          entityType: "organization",
          entityId: organizationId,
        },
        role: "logo",
      },
    );
    if (!result.success) {
      throw new RetryableError("Unable to detach organization logo media file");
    }
  }

  private linkLogoMediaReference(
    organizationId: string,
    fileId: string,
  ): Promise<Media.FileLinkResult> {
    return this.broker.call<Media.FileLinkResult, Media.FileLinkParams>("media.fileLink", {
      fileId,
      entityRef: {
        service: "iam",
        entityType: "organization",
        entityId: organizationId,
      },
      owner: { type: "organization", id: organizationId },
      role: "logo",
    });
  }
}
