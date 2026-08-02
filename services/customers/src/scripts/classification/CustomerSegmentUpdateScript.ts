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
  expectedRevision: number;
  operations: {
    details?: {
      name?: string | null;
      description?: string | null;
      color?: string | null;
    };
    definition?: {
      type?: CustomerSegment["type"] | null;
      query?: string | null;
      definition?: Record<string, unknown> | null;
    };
    state?: {
      status?: CustomerSegment["status"] | null;
    };
    memberships?: {
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
    if (current.revision !== params.expectedRevision) {
      return revisionConflict();
    }

    const errors = validateSegment(current, params.operations);
    const memberships = params.operations.memberships;
    const affectedCustomerIds = new Set<string>();
    const byMembershipId = new Map<string, CustomerSegmentMembership>();

    if (memberships) {
      const definition = params.operations.definition;
      const nextType = definition && hasOwn(definition, "type")
        ? definition.type
        : current.type;
      if (nextType !== "MANUAL") {
        errors.push({
          message: "Only manual segments can have explicit customer memberships",
          code: "SEGMENT_NOT_MANUAL",
          field: ["memberships"],
        });
      }
      if (
        memberships.setCustomerIds !== undefined &&
        (memberships.create.length > 0 ||
          memberships.update.length > 0 ||
          memberships.deleteIds.length > 0)
      ) {
        errors.push({
          message: "setCustomerIds cannot be combined with granular membership changes",
          code: "CONFLICTING_OPERATION",
          field: ["memberships", "setCustomerIds"],
        });
      }

      const createCustomerIds = memberships.create.map((item) => item.customerId);
      const setCustomerIds = memberships.setCustomerIds ?? [];
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
        ["memberships", "create"],
        "customerId",
        errors
      );
      validateCustomerIds(
        setCustomerIds,
        existingCustomerIds,
        ["memberships", "setCustomerIds"],
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
      for (const [index, input] of memberships.create.entries()) {
        if (existingCreateIds.has(input.customerId)) {
          errors.push({
            message: "Customer already belongs to this segment",
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

      const referencedMemberships = await this.repository.segment.getMembershipsByIds([
        ...memberships.update.map((item) => item.membershipId),
        ...memberships.deleteIds,
      ]);
      for (const membership of referencedMemberships) {
        byMembershipId.set(membership.id, membership);
      }
      const updateIds = new Set<string>();
      for (const [index, input] of memberships.update.entries()) {
        const membership = byMembershipId.get(input.membershipId);
        validateMembership(
          membership,
          params.id,
          ["memberships", "update", String(index), "membershipId"],
          errors
        );
        if (membership) affectedCustomerIds.add(membership.customerId);
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
        validateMembership(
          membership,
          params.id,
          ["memberships", "deleteIds", String(index)],
          errors
        );
        if (membership) affectedCustomerIds.add(membership.customerId);
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

      if (memberships.setCustomerIds !== undefined) {
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

    const patch = segmentPatch(params.operations);
    const definitionChanged = hasDefinitionChanged(current, patch);

    try {
      const result = await this.repository.segment.updateWithMemberships(
        params.id,
        patch,
        memberships ? membershipPatch(memberships) : undefined,
        params.expectedRevision,
        definitionChanged
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
  const details = operations.details;
  const definitionSection = operations.definition;
  const state = operations.state;
  const name = details && hasOwn(details, "name") ? details.name : current.name;
  const color = details && hasOwn(details, "color") ? details.color : current.color;
  const type = definitionSection && hasOwn(definitionSection, "type")
    ? definitionSection.type
    : current.type;
  const status = state && hasOwn(state, "status")
    ? state.status
    : current.status;
  const query = definitionSection && hasOwn(definitionSection, "query")
    ? definitionSection.query
    : current.query;
  const definitionValue = definitionSection && hasOwn(definitionSection, "definition")
    ? definitionSection.definition ?? {}
    : current.definition;
  const definition = isRecord(definitionValue) ? definitionValue : {};

  if (!name || name.trim().length === 0) {
    errors.push({
      message: "Segment name cannot be empty",
      code: "INVALID_NAME",
      field: ["details", "name"],
    });
  }
  if (color != null && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    errors.push({
      message: "Segment color must use #RRGGBB format",
      code: "INVALID_COLOR",
      field: ["details", "color"],
    });
  }
  if (type == null || status == null) {
    errors.push({
      message: "Segment type and status cannot be null",
      code: "INVALID_VALUE",
      field: type == null ? ["definition", "type"] : ["state", "status"],
    });
  }
  if (type === "DYNAMIC" && !query?.trim() && Object.keys(definition).length === 0) {
    errors.push({
      message: "A dynamic segment requires a query or definition",
      code: "MISSING_SEGMENT_DEFINITION",
      field: ["definition", "definition"],
    });
  }
  if (
    definitionSection &&
    hasOwn(definitionSection, "definition") &&
    definitionSection.definition !== null &&
    !isRecord(definitionSection.definition)
  ) {
    errors.push({
      message: "Segment definition must be a JSON object",
      code: "INVALID_DEFINITION",
      field: ["definition", "definition"],
    });
  }
  return errors;
}

function segmentPatch(
  operations: CustomerSegmentUpdateParams["operations"]
): CustomerSegmentPatch {
  const patch: CustomerSegmentPatch = {};
  const details = operations.details;
  if (details) {
    for (const field of ["name", "description", "color"] as const) {
      if (hasOwn(details, field)) Object.assign(patch, { [field]: details[field] });
    }
  }
  const definition = operations.definition;
  if (definition) {
    for (const field of ["type", "query", "definition"] as const) {
      if (!hasOwn(definition, field)) continue;
      const value =
        field === "query" && typeof definition[field] === "string"
          ? definition[field]?.trim() || null
          : field === "definition" && definition[field] === null
          ? {}
          : definition[field];
      Object.assign(patch, { [field]: value });
    }
  }
  const state = operations.state;
  if (state && hasOwn(state, "status")) {
    Object.assign(patch, { status: state.status });
  }
  return patch;
}

function hasDefinitionChanged(
  current: CustomerSegment,
  patch: CustomerSegmentPatch
): boolean {
  const nextType = patch.type ?? current.type;
  const nextQuery = hasOwn(patch, "query") ? patch.query ?? null : current.query;
  const nextDefinition = hasOwn(patch, "definition")
    ? patch.definition ?? {}
    : current.definition;

  return (
    nextType !== current.type ||
    nextQuery !== current.query ||
    canonicalJson(nextDefinition) !== canonicalJson(current.definition)
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function membershipPatch(
  memberships: NonNullable<CustomerSegmentUpdateParams["operations"]["memberships"]>
): CustomerSegmentMembershipRelationsPatch {
  return {
    create: memberships.create,
    update: memberships.update,
    deleteIds: memberships.deleteIds,
    ...(memberships.setCustomerIds !== undefined
      ? { setCustomerIds: memberships.setCustomerIds }
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
