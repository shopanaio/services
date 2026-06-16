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
  UserUpdateProfileParams,
  UserUpdateProfileResult,
} from "../scripts/user/dto/UserUpdateProfileDto.js";
import { UserUpdateProfileScript } from "../scripts/user/UserUpdateProfileScript.js";

export interface UserUpdateProfileSagaInput extends UserUpdateProfileParams {
  userId: string;
  previousAvatarId?: string | null;
  nextAvatarId?: string | null;
}

export type { UserUpdateProfileResult };

/**
 * Saga for user profile update.
 *
 * Steps:
 * 1. Update user profile in database
 * 2. Sync avatar back-refs (link new, unlink old)
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
    const { userId, previousAvatarId, nextAvatarId, ...updateParams } = input;

    // Step 1: Update user profile in database
    const result = await this.updateUserProfile(updateParams);

    if (result.userErrors.length > 0 || !result.userId) {
      return result;
    }

    // Step 2: Sync avatar back-refs
    if (previousAvatarId !== nextAvatarId) {
      await this.syncAvatarBackRefs(userId, previousAvatarId ?? null, nextAvatarId ?? null);
    }

    return result;
  }

  @SagaStep()
  private async updateUserProfile(
    input: UserUpdateProfileParams,
  ): Promise<UserUpdateProfileResult> {
    return this.kernel.runScript(UserUpdateProfileScript, input);
  }

  @SagaStep()
  private async syncAvatarBackRefs(
    userId: string,
    previousAvatarId: string | null,
    nextAvatarId: string | null,
  ): Promise<void> {
    const entityRef = {
      service: "iam",
      entityType: "user",
      entityId: userId,
    };
    const role = "avatar";

    if (nextAvatarId) {
      try {
        await this.broker.call<Media.FileLinkResult, Media.FileLinkParams>(
          "media.fileLink",
          { fileId: nextAvatarId, entityRef, role },
        );
      } catch (error) {
        this.logger.warn({ userId, fileId: nextAvatarId, error }, "Failed to link avatar");
      }
    }

    if (previousAvatarId) {
      try {
        await this.broker.call<Media.FileUnlinkResult, Media.FileUnlinkParams>(
          "media.fileUnlink",
          { fileId: previousAvatarId, entityRef, role },
        );
      } catch (error) {
        this.logger.warn({ userId, fileId: previousAvatarId, error }, "Failed to unlink avatar");
      }
    }
  }
}
