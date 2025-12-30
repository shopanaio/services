import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { AuthorizationError } from "@shopana/shared-kernel";
import {
  ownershipTransferInputSchema,
  type OwnershipTransferParams,
  type OwnershipTransferResult,
} from "./dto/OwnershipTransferDto.js";

/**
 * OwnershipTransferScript - Transfer organization ownership to another admin
 *
 * Only the current owner can transfer ownership.
 * The new owner must have admin role in the organization.
 */
export class OwnershipTransferScript extends BaseScript<
  OwnershipTransferParams,
  OwnershipTransferResult
> {
  @Transactional()
  @ZodSchema(ownershipTransferInputSchema)
  protected async execute(
    params: OwnershipTransferParams
  ): Promise<OwnershipTransferResult> {
    const { organizationId, newOwnerId } = params;
    const currentUserId = this.currentUser.id;

    // Check if current user is owner
    const isOwner = await this.repository.organization.isOwner(
      organizationId,
      currentUserId
    );

    if (!isOwner) {
      return {
        success: false,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: "Only the organization owner can transfer ownership",
            field: ["organizationId"],
          },
        ],
      };
    }

    // Check if new owner is a member of the organization
    const newOwnerRole = await this.repository.organization.findUserRole(
      organizationId,
      newOwnerId,
      "org"
    );

    if (!newOwnerRole) {
      return {
        success: false,
        userErrors: [
          {
            code: "INVALID_TARGET",
            message: "New owner must be a member of the organization",
            field: ["newOwnerId"],
          },
        ],
      };
    }

    // Get role details to check if admin
    const roleRecord = await this.repository.organization.findRole(
      organizationId,
      "org",
      "admin"
    );

    if (!roleRecord || newOwnerRole.roleId !== roleRecord.id) {
      return {
        success: false,
        userErrors: [
          {
            code: "INVALID_TARGET",
            message: "New owner must have admin role in the organization",
            field: ["newOwnerId"],
          },
        ],
      };
    }

    // Transfer ownership
    const result = await this.repository.organization.transferOwnership(
      organizationId,
      newOwnerId
    );

    if (!result.success) {
      return {
        success: false,
        userErrors: [
          {
            code: "TRANSFER_FAILED",
            message: result.error ?? "Failed to transfer ownership",
            field: [],
          },
        ],
      };
    }

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): OwnershipTransferResult {
    if (error instanceof ValidationError) {
      return {
        success: false,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        success: false,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: ["organizationId"],
          },
        ],
      };
    }

    this.logger.error({ error }, "OwnershipTransferScript failed");

    return {
      success: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: [],
        },
      ],
    };
  }
}
