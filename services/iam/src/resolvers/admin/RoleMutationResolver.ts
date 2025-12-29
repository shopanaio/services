import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { RoleResolver } from "./RoleResolver.js";
import type {
  RoleCreateInput,
  RoleUpdateInput,
  RoleDeleteInput,
} from "./generated/types.js";
import {
  RoleCreateInputSchema,
  RoleUpdateInputSchema,
  RoleDeleteInputSchema,
} from "./generated/schemas.js";

/**
 * RoleMutation namespace resolver.
 * Handles role CRUD operations.
 */
export class RoleMutationResolver extends IAMType<Record<string, never>> {
  /**
   * Create a new role with permissions for the organization.
   */
  @ZodResolver(RoleCreateInputSchema())
  async roleCreate(args: { input: RoleCreateInput }) {
    const { input } = args;

    // TODO: Implement role creation script
    // const result = await this.ctx.kernel.runScript(RoleCreateScript, input);

    return {
      role: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Role creation is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Update an existing role's display name, description, or permissions.
   */
  @ZodResolver(RoleUpdateInputSchema())
  async roleUpdate(args: { input: RoleUpdateInput }) {
    const { input } = args;

    // TODO: Implement role update script
    // const result = await this.ctx.kernel.runScript(RoleUpdateScript, input);

    return {
      role: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Role update is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Delete a custom role from the organization.
   */
  @ZodResolver(RoleDeleteInputSchema())
  async roleDelete(args: { input: RoleDeleteInput }) {
    const { input } = args;

    // TODO: Implement role delete script
    // const result = await this.ctx.kernel.runScript(RoleDeleteScript, input);

    return {
      deletedRoleId: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Role deletion is not implemented yet",
          field: null,
        },
      ],
    };
  }
}
