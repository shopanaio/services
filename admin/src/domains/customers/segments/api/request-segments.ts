import {
  deleteMockCustomerSegmentReference,
  getMockCustomerSegmentMemberIds,
  getMockCustomersSnapshot,
  registerMockCustomerSegmentReference,
  setMockCustomerSegmentMembers,
  updateMockCustomerSegmentReference,
} from "../../all-customers/api/request-customers";
import type {
  ApiCustomerSegment,
  ApiCustomerSegmentDetails,
  CustomerSegmentConnection,
  CustomerSegmentCreateInput,
  CustomerSegmentDeleteInput,
  CustomerSegmentDeletePayload,
  CustomerSegmentMembersSetInput,
  CustomerSegmentMutationPayload,
  CustomerSegmentOrderByInput,
  CustomerSegmentsQueryData,
  CustomerSegmentsQueryVariables,
  CustomerSegmentUpdateInput,
  CustomerSegmentUserError,
  CustomerSegmentWhereInput,
} from "../graphql/operation-types";
import {
  CustomerSegmentOrderField,
  CustomerSegmentType,
} from "../graphql/operation-types";

interface SegmentSeed {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

const segmentSeeds: SegmentSeed[] = [
  { id: "segment-vip", name: "VIP", description: "High-value customers who receive priority support.", color: "#d4380d", createdAt: "2025-08-14T09:20:00.000Z" },
  { id: "segment-repeat", name: "Repeat customers", description: "Customers assigned for retention and repeat-purchase workflows.", color: "#1677ff", createdAt: "2025-09-03T12:10:00.000Z" },
  { id: "segment-new", name: "New customers", description: "Recently acquired customers requiring onboarding attention.", color: "#389e0d", createdAt: "2025-10-21T15:45:00.000Z" },
  { id: "segment-at-risk", name: "At risk", description: "Customers requiring manual review by support or fraud teams.", color: "#d48806", createdAt: "2025-11-07T08:35:00.000Z" },
  { id: "segment-wholesale", name: "Wholesale", description: "Approved B2B and wholesale customer accounts.", color: "#722ed1", createdAt: "2025-12-11T10:00:00.000Z" },
  { id: "segment-newsletter", name: "Newsletter engaged", description: "Manual audience for editorial and launch communications.", color: "#08979c", createdAt: "2026-01-18T14:30:00.000Z" },
  { id: "segment-local-pickup", name: "Local pickup", description: "Customers served by local pickup operations.", color: "#c41d7f", createdAt: "2026-02-09T11:15:00.000Z" },
  { id: "segment-support", name: "Support follow-up", description: "Customers with cases that need an operator follow-up.", color: "#ad6800", createdAt: "2026-03-27T16:40:00.000Z" },
];

let mockSegments: ApiCustomerSegment[] = segmentSeeds.map((seed, index) => ({
  id: seed.id,
  version: 1,
  name: seed.name,
  description: seed.description,
  color: seed.color,
  type: CustomerSegmentType.Manual,
  memberCount: 0,
  createdAt: seed.createdAt,
  updatedAt: index < 5 ? "2026-07-10T13:00:00.000Z" : seed.createdAt,
}));

function withMemberCount(segment: ApiCustomerSegment): ApiCustomerSegment {
  return {
    ...segment,
    memberCount: getMockCustomerSegmentMemberIds(segment.id).length,
  };
}

function matchesCondition(value: unknown, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([operator, expected]) => {
    if (operator === "_containsi") {
      return String(value ?? "").toLowerCase().includes(String(expected).toLowerCase());
    }
    if (operator === "_in") return Array.isArray(expected) && expected.includes(value);
    if (operator === "_eq" || operator === "_is") return value === expected;
    if (operator === "_neq" || operator === "_isNot") return value !== expected;
    if (value === null || value === undefined) return false;
    if (operator === "_gte") return typeof value === "number" && typeof expected === "number"
      ? value >= expected
      : String(value) >= String(expected);
    if (operator === "_lte") return typeof value === "number" && typeof expected === "number"
      ? value <= expected
      : String(value) <= String(expected);
    if (operator === "_gt") return Number(value) > Number(expected);
    if (operator === "_lt") return Number(value) < Number(expected);
    return true;
  });
}

function matchesWhere(segment: ApiCustomerSegment, where?: CustomerSegmentWhereInput | null): boolean {
  if (!where) return true;
  if (where._and && !where._and.every((condition) => matchesWhere(segment, condition))) return false;
  if (where._or && !where._or.some((condition) => matchesWhere(segment, condition))) return false;

  return Object.entries(where).every(([field, condition]) => {
    if (field === "_and" || field === "_or" || !condition) return true;
    return matchesCondition(
      segment[field as keyof ApiCustomerSegment],
      condition as Record<string, unknown>,
    );
  });
}

type SortValue = string | number;

const orderFieldAccessors: Record<
  CustomerSegmentOrderField,
  (segment: ApiCustomerSegment) => SortValue
> = {
  [CustomerSegmentOrderField.Name]: (segment) => segment.name.toLowerCase(),
  [CustomerSegmentOrderField.MemberCount]: (segment) => segment.memberCount,
  [CustomerSegmentOrderField.CreatedAt]: (segment) => segment.createdAt,
  [CustomerSegmentOrderField.UpdatedAt]: (segment) => segment.updatedAt,
};

function sortSegments(
  segments: ApiCustomerSegment[],
  orderBy?: CustomerSegmentOrderByInput[] | null,
): ApiCustomerSegment[] {
  const sort = orderBy?.length
    ? orderBy
    : [{ field: CustomerSegmentOrderField.UpdatedAt, direction: "DESC" as const }];

  return [...segments].sort((left, right) => {
    for (const item of sort) {
      const leftValue = orderFieldAccessors[item.field](left);
      const rightValue = orderFieldAccessors[item.field](right);
      const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      if (comparison !== 0) return item.direction === "ASC" ? comparison : -comparison;
    }
    return left.id.localeCompare(right.id);
  });
}

const cursorForIndex = (index: number) => `customer-segment-cursor:${index}`;

function indexFromCursor(cursor?: string | null): number | null {
  if (!cursor) return null;
  const match = /^customer-segment-cursor:(\d+)$/.exec(cursor);
  return match ? Number(match[1]) : null;
}

function toConnection(
  segments: ApiCustomerSegment[],
  variables: CustomerSegmentsQueryVariables,
): CustomerSegmentConnection {
  const afterIndex = indexFromCursor(variables.after);
  const beforeIndex = indexFromCursor(variables.before);
  const endExclusive = beforeIndex ?? segments.length;
  const start = variables.last
    ? Math.max(0, endExclusive - variables.last)
    : Math.min(segments.length, (afterIndex ?? -1) + 1);
  const end = variables.last
    ? endExclusive
    : Math.min(segments.length, start + (variables.first ?? 20));
  const edges = segments.slice(start, end).map((node, index) => ({
    cursor: cursorForIndex(start + index),
    node,
  }));

  return {
    edges,
    totalCount: segments.length,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
      hasPreviousPage: start > 0,
      hasNextPage: end < segments.length,
    },
  };
}

export async function requestCustomerSegments(
  variables: CustomerSegmentsQueryVariables,
): Promise<CustomerSegmentsQueryData> {
  const segments = mockSegments.map(withMemberCount);
  const filtered = segments.filter((segment) => matchesWhere(segment, variables.where));
  const ordered = sortSegments(filtered, variables.orderBy);

  return Promise.resolve({
    customersQuery: {
      segments: toConnection(ordered, variables),
    },
  });
}

export async function requestCustomerSegment(id: string): Promise<ApiCustomerSegmentDetails | null> {
  const segment = mockSegments.find((current) => current.id === id);
  if (!segment) return Promise.resolve(null);
  const memberIds = getMockCustomerSegmentMemberIds(id);
  const edges = memberIds.map((customerId, index) => ({
    cursor: `customer-segment-member-cursor:${index}`,
    node: { id: customerId },
  }));

  return Promise.resolve({
    ...withMemberCount(segment),
    members: {
      edges,
      totalCount: edges.length,
      pageInfo: {
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
  });
}

function validateSegmentInput(
  input: CustomerSegmentCreateInput | CustomerSegmentUpdateInput,
  currentId?: string,
): CustomerSegmentUserError[] {
  const errors: CustomerSegmentUserError[] = [];
  if (!input.name.trim()) {
    errors.push({ code: "NAME_REQUIRED", field: "name", message: "Segment name is required." });
  }
  if (mockSegments.some((segment) =>
    segment.id !== currentId && segment.name.toLowerCase() === input.name.trim().toLowerCase()
  )) {
    errors.push({ code: "NAME_TAKEN", field: "name", message: "A segment with this name already exists." });
  }
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    errors.push({ code: "INVALID_COLOR", field: "color", message: "Select a valid segment color." });
  }
  return errors;
}

function versionConflict(): CustomerSegmentUserError {
  return {
    code: "VERSION_CONFLICT",
    field: null,
    message: "This segment was changed by another user. Reload and try again.",
  };
}

export async function requestCreateCustomerSegment(
  input: CustomerSegmentCreateInput,
): Promise<CustomerSegmentMutationPayload> {
  const userErrors = validateSegmentInput(input);
  if (userErrors.length > 0) return Promise.resolve({ segment: null, userErrors });

  const now = new Date().toISOString();
  const segment: ApiCustomerSegment = {
    id: `segment-${crypto.randomUUID()}`,
    version: 1,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    color: input.color,
    type: CustomerSegmentType.Manual,
    memberCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  mockSegments = [segment, ...mockSegments];
  registerMockCustomerSegmentReference({ id: segment.id, name: segment.name });
  return Promise.resolve({ segment, userErrors: [] });
}

export async function requestUpdateCustomerSegment(
  input: CustomerSegmentUpdateInput,
): Promise<CustomerSegmentMutationPayload> {
  const index = mockSegments.findIndex((segment) => segment.id === input.id);
  const current = mockSegments[index];
  if (!current) {
    return Promise.resolve({
      segment: null,
      userErrors: [{ code: "SEGMENT_NOT_FOUND", field: "id", message: "Segment no longer exists." }],
    });
  }
  if (current.version !== input.expectedVersion) {
    return Promise.resolve({ segment: null, userErrors: [versionConflict()] });
  }

  const userErrors = validateSegmentInput(input, current.id);
  if (userErrors.length > 0) return Promise.resolve({ segment: null, userErrors });

  const segment: ApiCustomerSegment = {
    ...current,
    version: current.version + 1,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    color: input.color,
    updatedAt: new Date().toISOString(),
  };
  mockSegments[index] = segment;
  updateMockCustomerSegmentReference({ id: segment.id, name: segment.name });
  return Promise.resolve({ segment: withMemberCount(segment), userErrors: [] });
}

export async function requestDeleteCustomerSegment(
  input: CustomerSegmentDeleteInput,
): Promise<CustomerSegmentDeletePayload> {
  const current = mockSegments.find((segment) => segment.id === input.id);
  if (!current) {
    return Promise.resolve({
      deletedSegmentId: null,
      userErrors: [{ code: "SEGMENT_NOT_FOUND", field: "id", message: "Segment no longer exists." }],
    });
  }
  if (current.version !== input.expectedVersion) {
    return Promise.resolve({ deletedSegmentId: null, userErrors: [versionConflict()] });
  }

  mockSegments = mockSegments.filter((segment) => segment.id !== current.id);
  deleteMockCustomerSegmentReference(current.id);
  return Promise.resolve({ deletedSegmentId: current.id, userErrors: [] });
}

export async function requestSetCustomerSegmentMembers(
  input: CustomerSegmentMembersSetInput,
): Promise<CustomerSegmentMutationPayload> {
  const index = mockSegments.findIndex((segment) => segment.id === input.id);
  const current = mockSegments[index];
  if (!current) {
    return Promise.resolve({
      segment: null,
      userErrors: [{ code: "SEGMENT_NOT_FOUND", field: "id", message: "Segment no longer exists." }],
    });
  }
  if (current.version !== input.expectedVersion) {
    return Promise.resolve({ segment: null, userErrors: [versionConflict()] });
  }

  const knownCustomerIds = new Set(getMockCustomersSnapshot().map((customer) => customer.id));
  const customerIds = [...new Set(input.customerIds)];
  if (customerIds.some((id) => !knownCustomerIds.has(id))) {
    return Promise.resolve({
      segment: null,
      userErrors: [{ code: "CUSTOMER_NOT_FOUND", field: "customerIds", message: "One or more customers no longer exist." }],
    });
  }

  const segment: ApiCustomerSegment = {
    ...current,
    version: current.version + 1,
    memberCount: customerIds.length,
    updatedAt: new Date().toISOString(),
  };
  mockSegments[index] = segment;
  setMockCustomerSegmentMembers({ id: segment.id, name: segment.name }, customerIds);
  return Promise.resolve({ segment, userErrors: [] });
}
