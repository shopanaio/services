import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type {
  CustomerSegmentMembershipRelationsPatch,
  CustomerSegmentPatch,
} from "../../repositories/classification/CustomerSegmentRepository.js";
import type {
  CustomerSegment,
  CustomerSegmentMembership,
} from "../../repositories/models/index.js";

export interface CustomerSegmentUpdateParams {
  id: string;
  expectedRevision?: number;
  operations: {
    name?: string | null;
    description?: string | null;
    color?: string | null;
    type?: CustomerSegment["type"] | null;
    status?: CustomerSegment["status"] | null;
    query?: string | null;
    definition?: Record<string, unknown> | null;
    customers?: {
      create: Array<{ customerId: string; expiresAt?: string | null }>;
      update: Array<{ membershipId: string; expiresAt?: string | null }>;
      deleteIds: string[];
      setCustomerIds?: string[];
    };
  };
}

export interface CustomerSegmentUpdateResult {
  segment?: { id: string; revision: number };
  affectedCustomerIds: string[];
  userErrors: UserError[];
}

export class CustomerSegmentUpdateScript extends BaseScript<
  CustomerSegmentUpdateParams,
  CustomerSegmentUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerSegmentUpdateParams
  ): Promise<CustomerSegmentUpdateResult> {
    const current = await this.repository.segment.findById(params.id);
    if (!current) return notFound();
    if (
      params.expectedRevision !== undefined &&
      current.revision !== params.expectedRevision
    ) {
      return revisionConflict();
    }

    const errors = validateSegment(current, params.operations);
    const customers = params.operations.customers;
    const affectedCustomerIds = new Set<string>();
    const byMembershipId = new Map<string, CustomerSegmentMembership>();

    if (customers) {
      const nextType = hasOwn(params.operations, "type")
        ? params.operations.type
        : current.type;
      if (nextType !== "MANUAL") {
        errors.push({
          message: "Only manual segments can have explicit customer memberships",
          code: "SEGMENT_NOT_MANUAL",
          field: ["customers"],
        });
      }
      if (
        customers.setCustomerIds !== undefined &&
        (customers.create.length > 0 ||
          customers.update.length > 0 ||
          customers.deleteIds.length > 0)
      ) {
        errors.push({
          message: "setCustomerIds cannot be combined with granular membership changes",
          code: "CONFLICTING_OPERATION",
          field: ["customers", "setCustomerIds"],
        });
      }

      const createCustomerIds = customers.create.map((item) => item.customerId);
      const setCustomerIds = customers.setCustomerIds ?? [];
      const referencedCustomerIds = [...createCustomerIds, ...setCustomerIds];
      const existingCustomers = await this.repository.customer.getByIds(
        referencedCustomerIds
      );
      const existingCustomerIds = new Set(
        existingCustomers.map((customer) => customer.id)
      );
      validateCustomerIds(
        createCustomerIds,
        existingCustomerIds,
        ["customers", "create"],
        "customerId",
        errors
      );
      validateCustomerIds(
        setCustomerIds,
        existingCustomerIds,
        ["customers", "setCustomerIds"],
        undefined,
        errors
      );
      for (const customerId of referencedCustomerIds) {
        affectedCustomerIds.add(customerId);
      }

      const existingCreateMemberships =
        await this.repository.segment.getMembershipsBySegmentAndCustomerIds(
          params.id,
          createCustomerIds
        );
      const existingCreateIds = new Set(
        existingCreateMemberships.map((membership) => membership.customerId)
      );
      for (const [index, input] of customers.create.entries()) {
        if (existingCreateIds.has(input.customerId)) {
          errors.push({
            message: "Customer already belongs to this segment",
            code: "DUPLICATE_MEMBERSHIP",
            field: ["customers", "create", String(index), "customerId"],
          });
        }
        validateExpiry(
          input.expiresAt,
          ["customers", "create", String(index), "expiresAt"],
          errors
        );
      }

      const referencedMemberships = await this.repository.segment.getMembershipsByIds([
        ...customers.update.map((item) => item.membershipId),
        ...customers.deleteIds,
      ]);
      for (const membership of referencedMemberships) {
        byMembershipId.set(membership.id, membership);
      }
      const updateIds = new Set<string>();
      for (const [index, input] of customers.update.entries()) {
        const membership = byMembershipId.get(input.membershipId);
        validateMembership(
          membership,
          params.id,
          ["customers", "update", String(index), "membershipId"],
          errors
        );
        if (membership) affectedCustomerIds.add(membership.customerId);
        if (updateIds.has(input.membershipId)) {
          errors.push({
            message: "Membership cannot be updated more than once",
            code: "DUPLICATE_ID",
            field: ["customers", "update", String(index), "membershipId"],
          });
        }
        updateIds.add(input.membershipId);
        validateExpiry(
          input.expiresAt,
          ["customers", "update", String(index), "expiresAt"],
          errors
        );
      }
      const deleteIds = new Set<string>();
      for (const [index, id] of customers.deleteIds.entries()) {
        const membership = byMembershipId.get(id);
        validateMembership(
          membership,
          params.id,
          ["customers", "deleteIds", String(index)],
          errors
        );
        if (membership) affectedCustomerIds.add(membership.customerId);
        if (deleteIds.has(id)) {
          errors.push({
            message: "Membership cannot be deleted more than once",
            code: "DUPLICATE_ID",
            field: ["customers", "deleteIds", String(index)],
          });
        }
        if (updateIds.has(id)) {
          errors.push({
            message: "Membership cannot be updated and deleted together",
            code: "CONFLICTING_OPERATION",
            field: ["customers", "deleteIds", String(index)],
          });
        }
        deleteIds.add(id);
      }

      if (customers.setCustomerIds !== undefined) {
        const previous = await this.repository.segment.getManualMembershipsBySegmentId(
          params.id
        );
        for (const membership of previous) {
          affectedCustomerIds.add(membership.customerId);
        }
      }
    }

    if (errors.length > 0) {
      return {
        segment: undefined,
        affectedCustomerIds: [...affectedCustomerIds],
        userErrors: errors,
      };
    }

    try {
      const result = await this.repository.segment.updateWithMemberships(
        params.id,
        segmentPatch(params.operations),
        customers ? membershipPatch(customers) : undefined,
        params.expectedRevision
      );
      if (!result) return revisionConflict();
      this.logger.info(
        { segmentId: result.segment.id, revision: result.segment.revision },
        "Customer segment updated"
      );
      return {
        segment: {
          id: result.segment.id,
          revision: result.segment.revision,
        },
        affectedCustomerIds: result.affectedCustomerIds,
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_segment_store_name_unique")) {
        return {
          segment: undefined,
          affectedCustomerIds: [...affectedCustomerIds],
          userErrors: [duplicateNameError()],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerSegmentUpdateResult {
    return {
      segment: undefined,
      affectedCustomerIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateSegment(
  current: CustomerSegment,
  operations: CustomerSegmentUpdateParams["operations"]
): UserError[] {
  const errors: UserError[] = [];
  const name = hasOwn(operations, "name") ? operations.name : current.name;
  const color = hasOwn(operations, "color") ? operations.color : current.color;
  const type = hasOwn(operations, "type") ? operations.type : current.type;
  const status = hasOwn(operations, "status") ? operations.status : current.status;
  const query = hasOwn(operations, "query") ? operations.query : current.query;
  const definitionValue = hasOwn(operations, "definition")
    ? operations.definition ?? {}
    : current.definition;
  const definition = isRecord(definitionValue) ? definitionValue : {};

  if (!name || name.trim().length === 0) {
    errors.push({
      message: "Segment name cannot be empty",
      code: "INVALID_NAME",
      field: ["name"],
    });
  }
  if (color != null && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    errors.push({
      message: "Segment color must use #RRGGBB format",
      code: "INVALID_COLOR",
      field: ["color"],
    });
  }
  if (type == null || status == null) {
    errors.push({
      message: "Segment type and status cannot be null",
      code: "INVALID_VALUE",
      field: [type == null ? "type" : "status"],
    });
  }
  if (type === "DYNAMIC" && !query?.trim() && Object.keys(definition).length === 0) {
    errors.push({
      message: "A dynamic segment requires a query or definition",
      code: "MISSING_SEGMENT_DEFINITION",
      field: ["definition"],
    });
  }
  if (
    hasOwn(operations, "definition") &&
    operations.definition !== null &&
    !isRecord(operations.definition)
  ) {
    errors.push({
      message: "Segment definition must be a JSON object",
      code: "INVALID_DEFINITION",
      field: ["definition"],
    });
  }
  return errors;
}

function segmentPatch(
  operations: CustomerSegmentUpdateParams["operations"]
): CustomerSegmentPatch {
  const patch: CustomerSegmentPatch = {};
  for (const field of [
    "name",
    "description",
    "color",
    "type",
    "status",
    "query",
    "definition",
  ] as const) {
    if (!hasOwn(operations, field)) continue;
    const value =
      field === "query" && typeof operations[field] === "string"
        ? operations[field]?.trim() || null
        : field === "definition" && operations[field] === null
          ? {}
          : operations[field];
    Object.assign(patch, { [field]: value });
  }
  return patch;
}

function membershipPatch(
  customers: NonNullable<CustomerSegmentUpdateParams["operations"]["customers"]>
): CustomerSegmentMembershipRelationsPatch {
  return {
    create: customers.create,
    update: customers.update,
    deleteIds: customers.deleteIds,
    ...(customers.setCustomerIds !== undefined
      ? { setCustomerIds: customers.setCustomerIds }
      : {}),
  };
}

function validateCustomerIds(
  ids: readonly string[],
  existingIds: ReadonlySet<string>,
  field: string[],
  childField: string | undefined,
  errors: UserError[]
) {
  const seen = new Set<string>();
  for (const [index, id] of ids.entries()) {
    const path = [...field, String(index), ...(childField ? [childField] : [])];
    if (!existingIds.has(id)) {
      errors.push({ message: "Customer not found", code: "NOT_FOUND", field: path });
    }
    if (seen.has(id)) {
      errors.push({
        message: "Customer cannot appear more than once",
        code: "DUPLICATE_ID",
        field: path,
      });
    }
    seen.add(id);
  }
}

function validateMembership(
  membership: CustomerSegmentMembership | undefined,
  segmentId: string,
  field: string[],
  errors: UserError[]
) {
  if (
    !membership ||
    membership.segmentId !== segmentId ||
    membership.source !== "MANUAL"
  ) {
    errors.push({
      message: "Manual customer segment membership not found",
      code: "NOT_FOUND",
      field,
    });
  }
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

function duplicateNameError(): UserError {
  return {
    message: "A customer segment with this name already exists",
    code: "DUPLICATE_SEGMENT_NAME",
    field: ["name"],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerSegmentUpdateResult {
  return {
    segment: undefined,
    affectedCustomerIds: [],
    userErrors: [
      {
        message: "Customer segment not found",
        field: ["segmentId"],
        code: "NOT_FOUND",
      },
    ],
  };
}

function revisionConflict(): CustomerSegmentUpdateResult {
  return {
    segment: undefined,
    affectedCustomerIds: [],
    userErrors: [
      {
        message: "Customer segment was modified by another user",
        field: ["expectedRevision"],
        code: "REVISION_CONFLICT",
      },
    ],
  };
}
