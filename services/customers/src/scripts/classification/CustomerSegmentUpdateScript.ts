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
import {
  SegmentStoreContextNotReadyError,
  resolveSegmentStoreContext,
  validateCustomerSegmentQuery,
} from "../../segments/service.js";

export interface CustomerSegmentUpdateParams {
  id: string;
  operations: {
    details?: {
      name?: string | null;
      description?: string | null;
      color?: string | null;
    };
    definition?: {
      query: string;
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
    params: CustomerSegmentUpdateParams,
  ): Promise<CustomerSegmentUpdateResult> {
    const current = await this.repository.segment.findById(params.id);
    if (!current) return notFound();
    const errors = validateSegment(current, params.operations);
    const memberships = params.operations.memberships;
    const affectedCustomerIds = new Set<string>();
    const byMembershipId = new Map<string, CustomerSegmentMembership>();

    if (memberships) {
      if (current.type !== "MANUAL") {
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
      const existingCustomers = await this.repository.customer.getByIds(referencedCustomerIds);
      const existingCustomerIds = new Set(existingCustomers.map((customer) => customer.id));
      validateCustomerIds(
        createCustomerIds,
        existingCustomerIds,
        ["memberships", "create"],
        "customerId",
        errors,
      );
      validateCustomerIds(
        setCustomerIds,
        existingCustomerIds,
        ["memberships", "setCustomerIds"],
        undefined,
        errors,
      );
      for (const customerId of referencedCustomerIds) {
        affectedCustomerIds.add(customerId);
      }

      const existingCreateMemberships =
        await this.repository.segment.getMembershipsBySegmentAndCustomerIds(
          params.id,
          createCustomerIds,
        );
      const existingCreateIds = new Set(
        existingCreateMemberships.map((membership) => membership.customerId),
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
          errors,
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
          errors,
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
          errors,
        );
      }
      const deleteIds = new Set<string>();
      for (const [index, id] of memberships.deleteIds.entries()) {
        const membership = byMembershipId.get(id);
        validateMembership(
          membership,
          params.id,
          ["memberships", "deleteIds", String(index)],
          errors,
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
        const previous = await this.repository.segment.getManualMembershipsBySegmentId(params.id);
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
    if (params.operations.definition) {
      if (current.type !== "DYNAMIC") {
        return {
          segment: undefined,
          affectedCustomerIds: [...affectedCustomerIds],
          userErrors: [
            {
              message: "Only a dynamic segment can update its query",
              code: "SEGMENT_QUERY_NOT_ALLOWED",
              field: ["definition", "query"],
              diagnostic: null,
            },
          ],
        };
      }
      try {
        const storeContext = await resolveSegmentStoreContext(this.repository, this.context.store);
        const validation = await validateCustomerSegmentQuery(
          this.repository,
          params.operations.definition.query,
          storeContext,
          new Date().toISOString(),
        );
        if (!validation.valid || !validation.definition || !validation.canonicalQuery) {
          return {
            segment: undefined,
            affectedCustomerIds: [...affectedCustomerIds],
            userErrors: validation.diagnostics
              .filter((diagnostic) => diagnostic.severity === "ERROR")
              .map((diagnostic) => ({
                message: diagnostic.message,
                code: diagnostic.code,
                field: ["definition", "query"],
                diagnostic,
              })),
          };
        }
        patch.query = params.operations.definition.query.trim();
        patch.definition = validation.definition as unknown as Record<string, unknown>;
      } catch (error) {
        if (error instanceof SegmentStoreContextNotReadyError) {
          return {
            segment: undefined,
            affectedCustomerIds: [...affectedCustomerIds],
            userErrors: [
              {
                message: error.message,
                code: error.code,
                field: ["definition", "query"],
                diagnostic: null,
              },
            ],
          };
        }
        throw error;
      }
    }
    const definitionChanged = hasDefinitionChanged(current, patch);
    const materializationChanged =
      current.type === "DYNAMIC" &&
      (definitionChanged || (patch.status === "ACTIVE" && current.status !== "ACTIVE"));

    try {
      const result = await this.repository.segment.updateWithMemberships(
        params.id,
        patch,
        memberships ? membershipPatch(memberships) : undefined,
        definitionChanged,
        materializationChanged,
      );
      if (!result) return notFound();
      if (materializationChanged) {
        await this.repository.segmentMaterialization.schedule(
          result.segment,
          new Date().toISOString(),
        );
      }
      this.logger.info(
        { segmentId: result.segment.id, revision: result.segment.revision },
        "Customer segment updated",
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
  operations: CustomerSegmentUpdateParams["operations"],
): UserError[] {
  const errors: UserError[] = [];
  const details = operations.details;
  const definitionSection = operations.definition;
  const state = operations.state;
  const name = details && hasOwn(details, "name") ? details.name : current.name;
  const color = details && hasOwn(details, "color") ? details.color : current.color;
  const status = state && hasOwn(state, "status") ? state.status : current.status;

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
  if (status == null) {
    errors.push({
      message: "Segment status cannot be null",
      code: "INVALID_VALUE",
      field: ["state", "status"],
    });
  }
  if (definitionSection && !definitionSection.query.trim()) {
    errors.push({
      message: "A dynamic segment requires a non-empty query",
      code: "SEGMENT_QUERY_REQUIRED",
      field: ["definition", "query"],
    });
  }
  return errors;
}

function segmentPatch(operations: CustomerSegmentUpdateParams["operations"]): CustomerSegmentPatch {
  const patch: CustomerSegmentPatch = {};
  const details = operations.details;
  if (details) {
    for (const field of ["name", "description", "color"] as const) {
      if (hasOwn(details, field)) Object.assign(patch, { [field]: details[field] });
    }
  }
  const definition = operations.definition;
  if (definition) {
    patch.query = definition.query.trim();
  }
  const state = operations.state;
  if (state && hasOwn(state, "status")) {
    Object.assign(patch, { status: state.status });
  }
  return patch;
}

function hasDefinitionChanged(current: CustomerSegment, patch: CustomerSegmentPatch): boolean {
  const nextQuery = hasOwn(patch, "query") ? (patch.query ?? null) : current.query;
  const nextDefinition = hasOwn(patch, "definition")
    ? (patch.definition ?? {})
    : current.definition;

  return (
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
  memberships: NonNullable<CustomerSegmentUpdateParams["operations"]["memberships"]>,
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
  errors: UserError[],
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
  errors: UserError[],
) {
  if (!membership || membership.segmentId !== segmentId || membership.source !== "MANUAL") {
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
  errors: UserError[],
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
