import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";

export interface CustomerTagUpdateParams {
  id: string;
  operations: {
    name?: string | null;
    assignments?: {
      create: Array<{ customerId: string }>;
      deleteIds: string[];
    };
  };
}

export interface CustomerTagUpdateResult {
  tag?: { id: string };
  affectedCustomerIds: string[];
  userErrors: UserError[];
}

export class CustomerTagUpdateScript extends BaseScript<
  CustomerTagUpdateParams,
  CustomerTagUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTagUpdateParams
  ): Promise<CustomerTagUpdateResult> {
    const current = await this.repository.tag.findById(params.id);
    if (!current) return notFound();

    const errors: UserError[] = [];
    if (
      hasOwn(params.operations, "name") &&
      (!params.operations.name || params.operations.name.trim().length === 0)
    ) {
      errors.push({
        message: "Tag name cannot be empty",
        code: "INVALID_NAME",
        field: ["name"],
      });
    }
    if (params.operations.name?.trim()) {
      const owner = await this.repository.tag.findByName(params.operations.name);
      if (owner && owner.id !== params.id) errors.push(duplicateNameError());
    }

    const assignments = params.operations.assignments;
    const affectedCustomerIds = new Set<string>();
    const byAssignmentId = new Map<
      string,
      Awaited<ReturnType<typeof this.repository.tag.findAssignmentById>>
    >();
    if (assignments) {
      const customerIds = assignments.create.map((item) => item.customerId);
      const customers = await this.repository.customer.getByIds(customerIds);
      const existingCustomerIds = new Set(customers.map((customer) => customer.id));
      const seenCustomerIds = new Set<string>();
      for (const [index, input] of assignments.create.entries()) {
        affectedCustomerIds.add(input.customerId);
        if (!existingCustomerIds.has(input.customerId)) {
          errors.push({
            message: "Customer not found",
            code: "NOT_FOUND",
            field: ["assignments", "create", String(index), "customerId"],
          });
        }
        if (seenCustomerIds.has(input.customerId)) {
          errors.push({
            message: "Customer assignment cannot be created more than once",
            code: "DUPLICATE_ID",
            field: ["assignments", "create", String(index), "customerId"],
          });
        }
        seenCustomerIds.add(input.customerId);
        if (await this.repository.tag.findAssignment(input.customerId, params.id)) {
          errors.push({
            message: "Customer already has this tag",
            code: "DUPLICATE_ASSIGNMENT",
            field: ["assignments", "create", String(index), "customerId"],
          });
        }
      }

      const referenced = await this.repository.tag.getAssignmentsByIds(
        assignments.deleteIds
      );
      for (const assignment of referenced) {
        byAssignmentId.set(assignment.id, assignment);
      }
      const seenDeleteIds = new Set<string>();
      for (const [index, id] of assignments.deleteIds.entries()) {
        const assignment = byAssignmentId.get(id);
        if (!assignment || assignment.tagId !== params.id) {
          errors.push({
            message: "Customer tag assignment not found",
            code: "NOT_FOUND",
            field: ["assignments", "deleteIds", String(index)],
          });
        } else {
          affectedCustomerIds.add(assignment.customerId);
        }
        if (seenDeleteIds.has(id)) {
          errors.push({
            message: "Assignment cannot be deleted more than once",
            code: "DUPLICATE_ID",
            field: ["assignments", "deleteIds", String(index)],
          });
        }
        seenDeleteIds.add(id);
      }
    }

    if (errors.length > 0) {
      return {
        tag: undefined,
        affectedCustomerIds: [...affectedCustomerIds],
        userErrors: errors,
      };
    }

    try {
      let tag = current;
      if (hasOwn(params.operations, "name")) {
        tag = (await this.repository.tag.update(
          params.id,
          params.operations.name!
        ))!;
      }
      if (assignments) {
        for (const input of assignments.create) {
          await this.repository.tag.assign(
            input.customerId,
            params.id,
            this.context.hasUser ? this.currentUser.id : null
          );
        }
        for (const id of assignments.deleteIds) {
          const assignment = byAssignmentId.get(id)!;
          await this.repository.tag.unassign(assignment.customerId, params.id);
        }
      }
      this.logger.info({ tagId: tag.id }, "Customer tag updated");
      for (const customerId of [...affectedCustomerIds].sort()) {
        await this.invalidateDynamicSegments(
          customerId,
          ["tag"],
          `tag:${params.id}`,
        );
      }
      return {
        tag: { id: tag.id },
        affectedCustomerIds: [...affectedCustomerIds],
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_tag_store_name_unique")) {
        return {
          tag: undefined,
          affectedCustomerIds: [...affectedCustomerIds],
          userErrors: [duplicateNameError()],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerTagUpdateResult {
    return {
      tag: undefined,
      affectedCustomerIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function duplicateNameError(): UserError {
  return {
    message: "A customer tag with this name already exists",
    code: "DUPLICATE_TAG_NAME",
    field: ["name"],
  };
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerTagUpdateResult {
  return {
    tag: undefined,
    affectedCustomerIds: [],
    userErrors: [
      {
        message: "Customer tag not found",
        field: ["tagId"],
        code: "NOT_FOUND",
      },
    ],
  };
}
