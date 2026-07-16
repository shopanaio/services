import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";

export interface CustomerGroupUpdateParams {
  id: string;
  operations: {
    code?: string | null;
    name?: string | null;
    description?: string | null;
    isDefault?: boolean | null;
    isActive?: boolean | null;
    memberships?: {
      create: Array<{
        customerId: string;
        isPrimary?: boolean | null;
        expiresAt?: string | null;
      }>;
      update: Array<{
        membershipId: string;
        isPrimary?: boolean | null;
        expiresAt?: string | null;
      }>;
      deleteIds: string[];
    };
  };
}

export interface CustomerGroupUpdateResult {
  group?: { id: string };
  affectedCustomerIds: string[];
  userErrors: UserError[];
}

export class CustomerGroupUpdateScript extends BaseScript<
  CustomerGroupUpdateParams,
  CustomerGroupUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerGroupUpdateParams
  ): Promise<CustomerGroupUpdateResult> {
    const current = await this.repository.group.findById(params.id);
    if (!current) return notFound();

    const errors = validateGroup(current, params.operations);
    const code = params.operations.code?.trim().toLowerCase();
    if (code) {
      const owner = await this.repository.group.findByCode(code);
      if (owner && owner.id !== params.id) errors.push(duplicateCodeError());
    }

    const memberships = params.operations.memberships;
    const affectedCustomerIds = new Set<string>();
    const byMembershipId = new Map<
      string,
      Awaited<ReturnType<typeof this.repository.group.findMembershipById>>
    >();
    if (memberships) {
      const customerIds = memberships.create.map((item) => item.customerId);
      const customers = await this.repository.customer.getByIds(customerIds);
      const existingCustomerIds = new Set(customers.map((customer) => customer.id));
      const seenCustomerIds = new Set<string>();
      for (const [index, input] of memberships.create.entries()) {
        affectedCustomerIds.add(input.customerId);
        if (!existingCustomerIds.has(input.customerId)) {
          errors.push({
            message: "Customer not found",
            code: "NOT_FOUND",
            field: ["memberships", "create", String(index), "customerId"],
          });
        }
        if (seenCustomerIds.has(input.customerId)) {
          errors.push({
            message: "Customer membership cannot be created more than once",
            code: "DUPLICATE_ID",
            field: ["memberships", "create", String(index), "customerId"],
          });
        }
        seenCustomerIds.add(input.customerId);
        if (await this.repository.group.findMembership(input.customerId, params.id)) {
          errors.push({
            message: "Customer already belongs to this group",
            code: "DUPLICATE_MEMBERSHIP",
            field: ["memberships", "create", String(index), "customerId"],
          });
        }
        validateExpiry(
          input.expiresAt,
          ["memberships", "create", String(index), "expiresAt"],
          errors
        );
      }

      const referenced = await this.repository.group.getMembershipsByIds([
        ...memberships.update.map((item) => item.membershipId),
        ...memberships.deleteIds,
      ]);
      for (const membership of referenced) {
        byMembershipId.set(membership.id, membership);
      }
      const updateIds = new Set<string>();
      for (const [index, input] of memberships.update.entries()) {
        const membership = byMembershipId.get(input.membershipId);
        if (
          !membership ||
          membership.groupId !== params.id ||
          membership.source !== "MANUAL"
        ) {
          errors.push(membershipNotFound([
            "memberships",
            "update",
            String(index),
            "membershipId",
          ]));
        } else {
          affectedCustomerIds.add(membership.customerId);
        }
        if (updateIds.has(input.membershipId)) {
          errors.push({
            message: "Membership cannot be updated more than once",
            code: "DUPLICATE_ID",
            field: ["memberships", "update", String(index), "membershipId"],
          });
        }
        updateIds.add(input.membershipId);
        validateExpiry(
          input.expiresAt,
          ["memberships", "update", String(index), "expiresAt"],
          errors
        );
      }
      const deleteIds = new Set<string>();
      for (const [index, id] of memberships.deleteIds.entries()) {
        const membership = byMembershipId.get(id);
        if (
          !membership ||
          membership.groupId !== params.id ||
          membership.source !== "MANUAL"
        ) {
          errors.push(
            membershipNotFound(["memberships", "deleteIds", String(index)])
          );
        } else {
          affectedCustomerIds.add(membership.customerId);
        }
        if (deleteIds.has(id)) {
          errors.push({
            message: "Membership cannot be deleted more than once",
            code: "DUPLICATE_ID",
            field: ["memberships", "deleteIds", String(index)],
          });
        }
        if (updateIds.has(id)) {
          errors.push({
            message: "Membership cannot be updated and deleted together",
            code: "CONFLICTING_OPERATION",
            field: ["memberships", "deleteIds", String(index)],
          });
        }
        deleteIds.add(id);
      }
    }

    if (errors.length > 0) {
      return {
        group: undefined,
        affectedCustomerIds: [...affectedCustomerIds],
        userErrors: errors,
      };
    }

    try {
      const group = await this.repository.group.update(
        params.id,
        groupPatch(params.operations)
      );
      if (!group) return notFound();

      if (memberships) {
        for (const input of memberships.create) {
          await this.repository.group.setMembership({
            customerId: input.customerId,
            groupId: params.id,
            isPrimary: input.isPrimary ?? false,
            source: "MANUAL",
            assignedById: this.context.hasUser ? this.currentUser.id : null,
            expiresAt: input.expiresAt ?? null,
          });
        }
        for (const input of memberships.update) {
          const currentMembership = byMembershipId.get(input.membershipId)!;
          await this.repository.group.setMembership({
            customerId: currentMembership.customerId,
            groupId: params.id,
            isPrimary: hasOwn(input, "isPrimary")
              ? input.isPrimary ?? false
              : currentMembership.isPrimary,
            source: "MANUAL",
            assignedById: this.context.hasUser ? this.currentUser.id : null,
            expiresAt: hasOwn(input, "expiresAt")
              ? input.expiresAt ?? null
              : currentMembership.expiresAt,
          });
        }
        for (const id of memberships.deleteIds) {
          const membership = byMembershipId.get(id)!;
          await this.repository.group.deleteMembership(
            membership.customerId,
            params.id
          );
        }
      }

      this.logger.info({ groupId: group.id }, "Customer group updated");
      return {
        group: { id: group.id },
        affectedCustomerIds: [...affectedCustomerIds],
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_group_store_code_unique")) {
        return {
          group: undefined,
          affectedCustomerIds: [...affectedCustomerIds],
          userErrors: [duplicateCodeError()],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerGroupUpdateResult {
    return {
      group: undefined,
      affectedCustomerIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateGroup(
  current: {
    code: string;
    name: string;
    isDefault: boolean;
    isActive: boolean;
  },
  operations: CustomerGroupUpdateParams["operations"]
): UserError[] {
  const errors: UserError[] = [];
  const code = hasOwn(operations, "code") ? operations.code : current.code;
  const name = hasOwn(operations, "name") ? operations.name : current.name;
  const isDefault = hasOwn(operations, "isDefault")
    ? operations.isDefault
    : current.isDefault;
  const isActive = hasOwn(operations, "isActive")
    ? operations.isActive
    : current.isActive;
  if (!code || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(code.trim().toLowerCase())) {
    errors.push({
      message: "Group code must contain only lowercase letters, numbers, _ or -",
      code: "INVALID_CODE",
      field: ["code"],
    });
  }
  if (!name || name.trim().length === 0) {
    errors.push({
      message: "Group name cannot be empty",
      code: "INVALID_NAME",
      field: ["name"],
    });
  }
  if (isDefault == null || isActive == null) {
    errors.push({
      message: "Group flags cannot be null",
      code: "INVALID_VALUE",
      field: [isDefault == null ? "isDefault" : "isActive"],
    });
  } else if (isDefault && !isActive) {
    errors.push({
      message: "An inactive group cannot be the default group",
      code: "DEFAULT_GROUP_INACTIVE",
      field: ["isDefault"],
    });
  }
  return errors;
}

function groupPatch(operations: CustomerGroupUpdateParams["operations"]) {
  const patch: Record<string, unknown> = {};
  for (const field of [
    "code",
    "name",
    "description",
    "isDefault",
    "isActive",
  ] as const) {
    if (hasOwn(operations, field)) Object.assign(patch, { [field]: operations[field] });
  }
  return patch;
}

function validateExpiry(
  expiresAt: string | null | undefined,
  field: string[],
  errors: UserError[]
) {
  if (expiresAt == null) return;
  const value = Date.parse(expiresAt);
  if (!Number.isFinite(value) || value <= Date.now()) {
    errors.push({
      message: "Membership expiry must be a future ISO 8601 date-time",
      code: "INVALID_EXPIRES_AT",
      field,
    });
  }
}

function membershipNotFound(field: string[]): UserError {
  return {
    message: "Manual customer group membership not found",
    code: "NOT_FOUND",
    field,
  };
}

function duplicateCodeError(): UserError {
  return {
    message: "A customer group with this code already exists",
    code: "DUPLICATE_GROUP_CODE",
    field: ["code"],
  };
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerGroupUpdateResult {
  return {
    group: undefined,
    affectedCustomerIds: [],
    userErrors: [
      {
        message: "Customer group not found",
        field: ["groupId"],
        code: "NOT_FOUND",
      },
    ],
  };
}
