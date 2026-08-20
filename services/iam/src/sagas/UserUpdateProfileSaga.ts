import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  RetryableError,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import type {
  UserUpdateProfileParams,
  UserUpdateProfileResult,
} from "../scripts/user/dto/UserUpdateProfileDto.js";
import { UserUpdateProfileScript } from "../scripts/user/UserUpdateProfileScript.js";
import { mediaLinkError } from "./mediaLinkError.js";

export interface UserUpdateProfileSagaInput extends UserUpdateProfileParams {
  previousAvatarId?: string | null;
  nextAvatarId?: string | null;
}

export type { UserUpdateProfileResult };

/**
 * Saga for user profile update.
 *
 * Steps:
 * 1. Link and validate the new avatar, when provided
 * 2. Update user profile in database
 * 3. Unlink the previous avatar
 */
@Injectable()
export class UserUpdateProfileSaga extends BrokerSaga<
  UserUpdateProfileSagaInput,
  UserUpdateProfileResult
> {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("userUpdateProfile")
  async run(input: UserUpdateProfileSagaInput): Promise<UserUpdateProfileResult> {
    const { previousAvatarId, nextAvatarId, ...updateParams } = input;
    const { userId } = updateParams;
    const avatarChanged = nextAvatarId !== undefined && previousAvatarId !== nextAvatarId;
    let nextAvatarLinked = false;

    if (avatarChanged && nextAvatarId) {
      const linkResult = await this.linkAvatarBackRef(userId, nextAvatarId);
      if (!linkResult.success) {
        return {
          userId: undefined,
          userErrors: [mediaLinkError(linkResult, "avatarId")],
        };
      }
      nextAvatarLinked = true;
    }

    const result = await this.updateUserProfile(updateParams);

    if (result.userErrors.length > 0 || !result.userId) {
      if (nextAvatarLinked && nextAvatarId) {
        await this.cleanupAvatarBackRef(userId, nextAvatarId);
      }
      return result;
    }

    if (avatarChanged && previousAvatarId) {
      await this.unlinkAvatarBackRef(userId, previousAvatarId);
    }

    return result;
  }

  @SagaStep()
  private async updateUserProfile(
    input: UserUpdateProfileParams,
  ): Promise<UserUpdateProfileResult> {
    return this.kernel.runScript(UserUpdateProfileScript, input);
  }

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async linkAvatarBackRef(userId: string, fileId: string): Promise<Media.FileLinkResult> {
    const result = await this.linkAvatarMediaReference(userId, fileId);
    if (result.code === "LINK_FAILED") {
      throw new RetryableError("Unable to attach avatar media file");
    }
    return result;
  }

  private async compensateLinkAvatarBackRef(userId: string, fileId: string): Promise<void> {
    await this.unlinkAvatarMediaReference(userId, fileId);
  }

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async cleanupAvatarBackRef(userId: string, fileId: string): Promise<void> {
    await this.unlinkAvatarMediaReference(userId, fileId);
  }

  private async compensateCleanupAvatarBackRef(userId: string, fileId: string): Promise<void> {
    const result = await this.linkAvatarMediaReference(userId, fileId);
    if (!result.success) {
      throw new RetryableError("Unable to restore avatar media reference");
    }
  }

  @SagaStep()
  private async unlinkAvatarBackRef(userId: string, fileId: string): Promise<void> {
    await this.unlinkAvatarMediaReference(userId, fileId);
  }

  private async unlinkAvatarMediaReference(userId: string, fileId: string): Promise<void> {
    const result = await this.broker.call<Media.FileUnlinkResult, Media.FileUnlinkParams>(
      "media.fileUnlink",
      {
        fileId,
        entityRef: {
          service: "iam",
          entityType: "user",
          entityId: userId,
        },
        role: "avatar",
      },
    );
    if (!result.success) {
      throw new RetryableError("Unable to detach avatar media file");
    }
  }

  private linkAvatarMediaReference(userId: string, fileId: string): Promise<Media.FileLinkResult> {
    return this.broker.call<Media.FileLinkResult, Media.FileLinkParams>("media.fileLink", {
      fileId,
      entityRef: {
        service: "iam",
        entityType: "user",
        entityId: userId,
      },
      owner: { type: "user_profile", id: userId },
      role: "avatar",
    });
  }
}
