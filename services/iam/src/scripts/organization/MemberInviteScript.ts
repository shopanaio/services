import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import {
  InvitedMember,
  memberInviteInputSchema,
  type MemberInviteParams,
  type MemberInviteResult,
} from "./dto/MemberInviteDto.js";
import type { Domain } from "../../casbin/CasbinService.js";

/**
 * MemberInviteScript - Invite a user to organization with role assignments
 *
 * Flow:
 * 1. Check authorization (org.members:write required)
 * 2. Find user by email (must exist in system)
 * 3. Add user as organization member (if not already)
 * 4. For each role assignment:
 *    - Find role in the specified domain
 *    - Create user_role record
 *    - Assign role in Casbin
 * 5. Return the first role assignment as the member result
 */
export class MemberInviteScript extends BaseScript<
  MemberInviteParams,
  MemberInviteResult
> {
  @Transactional()
  @ZodSchema(memberInviteInputSchema)
  @Policy({
    resource: "org.members",
    action: "write",
    organizationId: (_self: MemberInviteScript, params: MemberInviteParams) =>
      params.organizationId,
  })
  protected async execute(
    params: MemberInviteParams
  ): Promise<MemberInviteResult> {
    const { organizationId, email, roles } = params;
    const currentUserId = this.currentUser.id;

    // 1. Find user by email
    const user = await this.repository.user.findByEmail(email);
    if (!user) {
      return {
        member: null,
        userErrors: [
          {
            code: "USER_NOT_FOUND",
            message: `User with email "${email}" not found. User must sign up first.`,
            field: ["email"],
          },
        ],
      };
    }

    // 2. Add user as organization member (if not already)
    const existingMember = await this.repository.organization.findMember(
      organizationId,
      user.id
    );

    if (!existingMember) {
      await this.repository.organization.addMember({
        organizationId,
        userId: user.id,
        invitedBy: currentUserId,
      });
    }

    // 3. Assign roles
    let firstAssignment: InvitedMember | null = null;
    let newRolesAssigned = false;

    for (const roleAssignment of roles) {
      const { domain, role: roleName } = roleAssignment;

      // Find role in the specified domain
      const role = await this.repository.organization.findRole(
        organizationId,
        domain,
        roleName
      );

      if (!role) {
        return {
          member: null,
          userErrors: [
            {
              code: "ROLE_NOT_FOUND",
              message: `Role "${roleName}" not found in domain "${domain}"`,
              field: ["roles"],
            },
          ],
        };
      }

      // Check if user already has this role in this domain
      const existingRole = await this.repository.organization.findUserRole(
        organizationId,
        user.id,
        domain
      );

      if (existingRole) {
        // User already has a role in this domain - skip
        if (!firstAssignment) {
          firstAssignment = {
            id: existingRole.id,
            userId: user.id,
            role: roleName,
            domain,
            organizationId,
            grantedAt: existingRole.grantedAt,
            grantedBy: existingRole.grantedBy,
          };
        }
        continue;
      }

      // Create user role assignment in database
      const userRole = await this.repository.organization.createUserRole({
        organizationId,
        userId: user.id,
        roleId: role.id,
        domain,
        grantedBy: currentUserId,
      });

      // Assign role in Casbin
      await this.repository.casbin.assignRole({
        organizationId,
        userId: user.id,
        role: roleName,
        domain: domain as Domain,
      });

      newRolesAssigned = true;

      // Store first assignment for result
      if (!firstAssignment) {
        firstAssignment = {
          id: userRole.id,
          userId: user.id,
          role: roleName,
          domain,
          organizationId,
          grantedAt: userRole.grantedAt,
          grantedBy: userRole.grantedBy,
        };
      }

      this.logger.debug(
        { userId: user.id, organizationId, domain, roleName },
        "MemberInviteScript: Role assigned successfully"
      );
    }

    if (!firstAssignment) {
      return {
        member: null,
        userErrors: [
          {
            code: "NO_ROLES_ASSIGNED",
            message: "No roles were assigned",
            field: [],
          },
        ],
      };
    }

    // If no new roles were assigned, it's a duplicate invitation
    if (!newRolesAssigned) {
      return {
        member: null,
        userErrors: [
          {
            code: "ALREADY_INVITED",
            message: `User "${email}" is already a member with the requested roles`,
            field: ["email"],
          },
        ],
      };
    }

    return {
      member: firstAssignment,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): MemberInviteResult {
    if (error instanceof ValidationError) {
      return {
        member: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        member: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: [],
          },
        ],
      };
    }

    this.logger.error({ error }, "MemberInviteScript failed");

    return {
      member: null,
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
