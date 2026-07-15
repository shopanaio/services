import type {
  ApiCustomer,
  ApiCustomerAddress,
  ApiCustomerSegmentReference,
  CustomerConnection,
  CustomerCreateInput,
  CustomerMutationPayload,
  CustomerOrderByInput,
  CustomersQueryData,
  CustomersQueryVariables,
  CustomerUpdateInput,
  CustomerUserError,
  CustomerWhereInput,
} from "../graphql/operation-types";
import {
  CustomerMarketingState,
  CustomerOrderField,
  CustomerStatus,
} from "../graphql/operation-types";

export let customerSegments: ApiCustomerSegmentReference[] = [
  { id: "segment-vip", name: "VIP" },
  { id: "segment-repeat", name: "Repeat customers" },
  { id: "segment-new", name: "New customers" },
  { id: "segment-at-risk", name: "At risk" },
  { id: "segment-wholesale", name: "Wholesale" },
  { id: "segment-newsletter", name: "Newsletter engaged" },
  { id: "segment-local-pickup", name: "Local pickup" },
  { id: "segment-support", name: "Support follow-up" },
];

interface CustomerSeed {
  firstName: string;
  lastName: string;
  city: string;
  countryCode: string;
  locale: string;
}

const customerSeeds: CustomerSeed[] = [
  { firstName: "Olivia", lastName: "Martin", city: "Kyiv", countryCode: "UA", locale: "uk" },
  { firstName: "Noah", lastName: "Williams", city: "Austin", countryCode: "US", locale: "en" },
  { firstName: "Emma", lastName: "Johnson", city: "London", countryCode: "GB", locale: "en" },
  { firstName: "Liam", lastName: "Brown", city: "Berlin", countryCode: "DE", locale: "de" },
  { firstName: "Ava", lastName: "Davis", city: "Paris", countryCode: "FR", locale: "fr" },
  { firstName: "Ethan", lastName: "Wilson", city: "Lviv", countryCode: "UA", locale: "uk" },
  { firstName: "Mia", lastName: "Anderson", city: "Chicago", countryCode: "US", locale: "en" },
  { firstName: "Lucas", lastName: "Taylor", city: "Manchester", countryCode: "GB", locale: "en" },
  { firstName: "Sophia", lastName: "Thomas", city: "Hamburg", countryCode: "DE", locale: "de" },
  { firstName: "Mateo", lastName: "Moore", city: "Lyon", countryCode: "FR", locale: "fr" },
  { firstName: "Isabella", lastName: "Jackson", city: "Odesa", countryCode: "UA", locale: "uk" },
  { firstName: "James", lastName: "White", city: "Seattle", countryCode: "US", locale: "en" },
  { firstName: "Amelia", lastName: "Harris", city: "Bristol", countryCode: "GB", locale: "en" },
  { firstName: "Benjamin", lastName: "Martin", city: "Munich", countryCode: "DE", locale: "de" },
  { firstName: "Charlotte", lastName: "Thompson", city: "Nice", countryCode: "FR", locale: "fr" },
  { firstName: "Daniel", lastName: "Garcia", city: "Dnipro", countryCode: "UA", locale: "uk" },
  { firstName: "Harper", lastName: "Martinez", city: "Denver", countryCode: "US", locale: "en" },
  { firstName: "Henry", lastName: "Robinson", city: "Edinburgh", countryCode: "GB", locale: "en" },
  { firstName: "Evelyn", lastName: "Clark", city: "Cologne", countryCode: "DE", locale: "de" },
  { firstName: "Alexander", lastName: "Rodriguez", city: "Bordeaux", countryCode: "FR", locale: "fr" },
  { firstName: "Sofia", lastName: "Lewis", city: "Kharkiv", countryCode: "UA", locale: "uk" },
  { firstName: "Michael", lastName: "Lee", city: "Boston", countryCode: "US", locale: "en" },
  { firstName: "Camila", lastName: "Walker", city: "Leeds", countryCode: "GB", locale: "en" },
  { firstName: "Sebastian", lastName: "Hall", city: "Frankfurt", countryCode: "DE", locale: "de" },
];

const emailDomains = ["example.com", "mailbox.co", "shopper.net"];

const toIsoDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month, day, 9, 30)).toISOString();

let mockCustomers: ApiCustomer[] = customerSeeds.map((seed, index) => {
  const ordersCount = index % 6 === 0 ? 0 : ((index * 7) % 39) + 1;
  const totalSpentMinor = ordersCount * (3_400 + index * 879);
  const isBlocked = index === 7 || index === 18;
  const isDisabled = index === 5 || index === 14 || index === 22;
  const status = isBlocked
    ? CustomerStatus.Blocked
    : isDisabled
      ? CustomerStatus.Disabled
      : CustomerStatus.Active;
  const createdAt = toIsoDate(2024 + (index % 2), index % 12, (index % 25) + 1);
  const lastOrderAt = ordersCount > 0
    ? toIsoDate(2026, 6 - (index % 5), Math.max(1, 14 - (index % 12)))
    : null;
  const displayName = `${seed.firstName} ${seed.lastName}`;
  const normalizedName = `${seed.firstName}.${seed.lastName}`.toLowerCase();

  return {
    id: `customer-${String(index + 1).padStart(2, "0")}`,
    version: 1,
    firstName: seed.firstName,
    lastName: seed.lastName,
    displayName,
    email: `${normalizedName}${index > 14 ? index + 1 : ""}@${emailDomains[index % emailDomains.length]}`,
    phone: index % 5 === 0 ? null : `+${seed.countryCode === "US" ? "1" : "380"} 555 ${String(1200 + index).padStart(4, "0")}`,
    status,
    locale: seed.locale,
    taxExempt: index === 12 || index === 19,
    tags: [index % 2 === 0 ? "online" : "retail", ordersCount > 15 ? "high-value" : "standard"],
    note: index % 4 === 0 ? "Prefers delivery updates by email." : null,
    emailMarketingState: index % 3 === 0
      ? CustomerMarketingState.Subscribed
      : index % 3 === 1
        ? CustomerMarketingState.NotSubscribed
        : CustomerMarketingState.Pending,
    smsMarketingState: index % 4 === 0
      ? CustomerMarketingState.Subscribed
      : CustomerMarketingState.NotSubscribed,
    segments: [
      customerSegments[ordersCount > 15 ? 1 : 2]!,
      ...(ordersCount > 25 ? [customerSegments[0]!] : []),
      ...(isBlocked ? [customerSegments[3]!] : []),
      ...(index === 12 || index === 19 ? [customerSegments[4]!] : []),
    ],
    defaultAddress: {
      id: `customer-address-${index + 1}`,
      address1: `${18 + index} Market Street`,
      address2: index % 6 === 0 ? `Suite ${index + 2}` : null,
      city: seed.city,
      province: null,
      postalCode: `${10000 + index * 137}`,
      countryCode: seed.countryCode,
    },
    activity: {
      ordersCount,
      totalSpentMinor,
      averageOrderValueMinor: ordersCount > 0 ? Math.round(totalSpentMinor / ordersCount) : 0,
      returnsCount: ordersCount > 8 ? index % 3 : 0,
      lastOrderAt,
    },
    moderation: {
      blockedReason: isBlocked ? "Repeated payment disputes require manual review." : null,
      moderationNote: isBlocked ? "Review the latest support cases before approving new orders." : null,
    },
    createdAt,
    updatedAt: lastOrderAt ?? createdAt,
  };
});

const getCustomerField = (customer: ApiCustomer, field: string): unknown => {
  switch (field) {
    case "segmentId":
      return customer.segments.map((segment) => segment.id);
    case "countryCode":
      return customer.defaultAddress?.countryCode ?? null;
    case "ordersCount":
      return customer.activity.ordersCount;
    case "totalSpentMinor":
      return customer.activity.totalSpentMinor;
    case "lastOrderAt":
      return customer.activity.lastOrderAt;
    default:
      return customer[field as keyof ApiCustomer];
  }
};

function matchesCondition(value: unknown, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([operator, expected]) => {
    const values = Array.isArray(value) ? value : [value];
    if (operator === "_containsi") {
      return values.some((item) => String(item ?? "").toLowerCase().includes(String(expected).toLowerCase()));
    }
    if (operator === "_notContainsi") {
      return values.every((item) => !String(item ?? "").toLowerCase().includes(String(expected).toLowerCase()));
    }
    if (operator === "_in") {
      return Array.isArray(expected) && values.some((item) => expected.includes(item));
    }
    if (operator === "_notIn") {
      return Array.isArray(expected) && values.every((item) => !expected.includes(item));
    }
    if (operator === "_eq" || operator === "_is") return values.includes(expected);
    if (operator === "_neq" || operator === "_isNot") return !values.includes(expected);
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

function matchesWhere(customer: ApiCustomer, where?: CustomerWhereInput | null): boolean {
  if (!where) return true;
  if (where._and && !where._and.every((condition) => matchesWhere(customer, condition))) return false;
  if (where._or && !where._or.some((condition) => matchesWhere(customer, condition))) return false;

  return Object.entries(where).every(([field, condition]) => {
    if (field === "_and" || field === "_or" || !condition) return true;
    return matchesCondition(getCustomerField(customer, field), condition as Record<string, unknown>);
  });
}

type SortValue = string | number | null;

const orderFieldAccessors: Record<CustomerOrderField, (customer: ApiCustomer) => SortValue> = {
  [CustomerOrderField.DisplayName]: (customer) => customer.displayName.toLocaleLowerCase(),
  [CustomerOrderField.Email]: (customer) => customer.email.toLocaleLowerCase(),
  [CustomerOrderField.Status]: (customer) => customer.status,
  [CustomerOrderField.OrdersCount]: (customer) => customer.activity.ordersCount,
  [CustomerOrderField.TotalSpentMinor]: (customer) => customer.activity.totalSpentMinor,
  [CustomerOrderField.LastOrderAt]: (customer) => customer.activity.lastOrderAt,
  [CustomerOrderField.CreatedAt]: (customer) => customer.createdAt,
  [CustomerOrderField.UpdatedAt]: (customer) => customer.updatedAt,
};

function compareValues(left: SortValue, right: SortValue): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortCustomers(customers: ApiCustomer[], orderBy?: CustomerOrderByInput[] | null): ApiCustomer[] {
  const sort = orderBy?.length
    ? orderBy
    : [{ field: CustomerOrderField.UpdatedAt, direction: "DESC" as const }];

  return [...customers].sort((left, right) => {
    for (const item of sort) {
      const leftValue = orderFieldAccessors[item.field](left);
      const rightValue = orderFieldAccessors[item.field](right);
      if (leftValue === null && rightValue !== null) return 1;
      if (rightValue === null && leftValue !== null) return -1;
      const comparison = compareValues(
        leftValue,
        rightValue,
      );
      if (comparison !== 0) return item.direction === "ASC" ? comparison : -comparison;
    }
    return left.id.localeCompare(right.id);
  });
}

const cursorForIndex = (index: number) => `customer-cursor:${index}`;

function indexFromCursor(cursor?: string | null): number | null {
  if (!cursor) return null;
  const match = /^customer-cursor:(\d+)$/.exec(cursor);
  return match ? Number(match[1]) : null;
}

function toConnection(customers: ApiCustomer[], variables: CustomersQueryVariables): CustomerConnection {
  const afterIndex = indexFromCursor(variables.after);
  const beforeIndex = indexFromCursor(variables.before);
  const endExclusive = beforeIndex ?? customers.length;
  const start = variables.last
    ? Math.max(0, endExclusive - variables.last)
    : Math.min(customers.length, (afterIndex ?? -1) + 1);
  const end = variables.last
    ? endExclusive
    : Math.min(customers.length, start + (variables.first ?? 20));
  const edges = customers.slice(start, end).map((node, index) => ({
    cursor: cursorForIndex(start + index),
    node,
  }));

  return {
    edges,
    totalCount: customers.length,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
      hasPreviousPage: start > 0,
      hasNextPage: end < customers.length,
    },
  };
}

/** Mock transport boundary; replace only this function family when the subgraph lands. */
export async function requestCustomers(variables: CustomersQueryVariables): Promise<CustomersQueryData> {
  const filtered = mockCustomers.filter((customer) => matchesWhere(customer, variables.where));
  const ordered = sortCustomers(filtered, variables.orderBy);

  return Promise.resolve({
    customersQuery: {
      customers: toConnection(ordered, variables),
    },
  });
}

export async function requestCustomer(id: string): Promise<ApiCustomer | null> {
  return Promise.resolve(mockCustomers.find((customer) => customer.id === id) ?? null);
}

export async function requestCustomerEditorContext() {
  return Promise.resolve({ segments: [...customerSegments] });
}

/** Shared in-memory state helpers used only by the manual-segments mock API. */
export function getMockCustomersSnapshot(): ApiCustomer[] {
  return [...mockCustomers];
}

export function getMockCustomerSegmentMemberIds(segmentId: string): string[] {
  return mockCustomers
    .filter((customer) => customer.segments.some((segment) => segment.id === segmentId))
    .map((customer) => customer.id);
}

export function registerMockCustomerSegmentReference(segment: ApiCustomerSegmentReference): void {
  if (customerSegments.some((current) => current.id === segment.id)) return;
  customerSegments = [...customerSegments, segment];
}

export function updateMockCustomerSegmentReference(segment: ApiCustomerSegmentReference): void {
  customerSegments = customerSegments.map((current) =>
    current.id === segment.id ? segment : current
  );
  mockCustomers = mockCustomers.map((customer) => ({
    ...customer,
    segments: customer.segments.map((current) =>
      current.id === segment.id ? segment : current
    ),
  }));
}

export function deleteMockCustomerSegmentReference(segmentId: string): void {
  customerSegments = customerSegments.filter((segment) => segment.id !== segmentId);
  mockCustomers = mockCustomers.map((customer) => ({
    ...customer,
    segments: customer.segments.filter((segment) => segment.id !== segmentId),
  }));
}

export function setMockCustomerSegmentMembers(
  segment: ApiCustomerSegmentReference,
  customerIds: string[],
): void {
  const memberIds = new Set(customerIds);
  mockCustomers = mockCustomers.map((customer) => {
    const otherSegments = customer.segments.filter((current) => current.id !== segment.id);
    return {
      ...customer,
      segments: memberIds.has(customer.id)
        ? [...otherSegments, segment]
        : otherSegments,
    };
  });
}

function validateCustomerInput(
  input: CustomerCreateInput | CustomerUpdateInput,
  currentCustomerId?: string,
): CustomerUserError[] {
  const errors: CustomerUserError[] = [];
  if (!input.firstName.trim()) {
    errors.push({ code: "FIRST_NAME_REQUIRED", field: "firstName", message: "First name is required." });
  }
  if (!input.lastName.trim()) {
    errors.push({ code: "LAST_NAME_REQUIRED", field: "lastName", message: "Last name is required." });
  }
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) {
    errors.push({ code: "INVALID_EMAIL", field: "email", message: "Enter a valid email address." });
  }
  if (mockCustomers.some((customer) =>
    customer.id !== currentCustomerId && customer.email.toLowerCase() === input.email.trim().toLowerCase()
  )) {
    errors.push({ code: "EMAIL_TAKEN", field: "email", message: "A customer with this email already exists." });
  }
  if (input.status === CustomerStatus.Blocked && !input.blockedReason?.trim()) {
    errors.push({ code: "BLOCKED_REASON_REQUIRED", field: "blockedReason", message: "Add a reason when blocking a customer." });
  }
  if (input.segmentIds.some((id) => !customerSegments.some((segment) => segment.id === id))) {
    errors.push({ code: "SEGMENT_NOT_FOUND", field: "segmentIds", message: "One or more selected segments no longer exist." });
  }
  if (input.defaultAddress && !input.defaultAddress.countryCode) {
    errors.push({ code: "COUNTRY_REQUIRED", field: "defaultAddress.countryCode", message: "Country is required for an address." });
  }
  return errors;
}

function toAddress(
  input: CustomerCreateInput["defaultAddress"],
  current?: ApiCustomerAddress | null,
): ApiCustomerAddress | null {
  if (!input) return null;
  return {
    id: current?.id ?? `customer-address-${crypto.randomUUID()}`,
    address1: input.address1.trim(),
    address2: input.address2?.trim() || null,
    city: input.city.trim(),
    province: input.province?.trim() || null,
    postalCode: input.postalCode.trim(),
    countryCode: input.countryCode,
  };
}

export async function requestCreateCustomer(input: CustomerCreateInput): Promise<CustomerMutationPayload> {
  const userErrors = validateCustomerInput(input);
  if (userErrors.length > 0) return Promise.resolve({ customer: null, userErrors });

  const now = new Date().toISOString();
  const customer: ApiCustomer = {
    id: `customer-${crypto.randomUUID()}`,
    version: 1,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName: `${input.firstName.trim()} ${input.lastName.trim()}`,
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    status: input.status,
    locale: input.locale,
    taxExempt: input.taxExempt,
    tags: input.tags,
    note: input.note?.trim() || null,
    emailMarketingState: input.emailMarketingState,
    smsMarketingState: input.smsMarketingState,
    segments: customerSegments.filter((segment) => input.segmentIds.includes(segment.id)),
    defaultAddress: toAddress(input.defaultAddress),
    activity: {
      ordersCount: 0,
      totalSpentMinor: 0,
      averageOrderValueMinor: 0,
      returnsCount: 0,
      lastOrderAt: null,
    },
    moderation: {
      blockedReason: input.status === CustomerStatus.Blocked ? input.blockedReason?.trim() || null : null,
      moderationNote: input.moderationNote?.trim() || null,
    },
    createdAt: now,
    updatedAt: now,
  };
  mockCustomers = [customer, ...mockCustomers];
  return Promise.resolve({ customer, userErrors: [] });
}

export async function requestUpdateCustomer(input: CustomerUpdateInput): Promise<CustomerMutationPayload> {
  const customerIndex = mockCustomers.findIndex((customer) => customer.id === input.id);
  const current = mockCustomers[customerIndex];
  if (!current) {
    return Promise.resolve({
      customer: null,
      userErrors: [{ code: "CUSTOMER_NOT_FOUND", field: "id", message: "Customer no longer exists." }],
    });
  }
  if (current.version !== input.expectedVersion) {
    return Promise.resolve({
      customer: null,
      userErrors: [{
        code: "VERSION_CONFLICT",
        field: null,
        message: "This customer was changed by another user. Reload and try again.",
      }],
    });
  }

  const userErrors = validateCustomerInput(input, current.id);
  if (userErrors.length > 0) return Promise.resolve({ customer: null, userErrors });

  const customer: ApiCustomer = {
    ...current,
    version: current.version + 1,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName: `${input.firstName.trim()} ${input.lastName.trim()}`,
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    status: input.status,
    locale: input.locale,
    taxExempt: input.taxExempt,
    tags: input.tags,
    note: input.note?.trim() || null,
    emailMarketingState: input.emailMarketingState,
    smsMarketingState: input.smsMarketingState,
    segments: customerSegments.filter((segment) => input.segmentIds.includes(segment.id)),
    defaultAddress: toAddress(input.defaultAddress, current.defaultAddress),
    moderation: {
      ...current.moderation,
      blockedReason: input.status === CustomerStatus.Blocked ? input.blockedReason?.trim() || null : null,
      moderationNote: input.moderationNote?.trim() || null,
    },
    updatedAt: new Date().toISOString(),
  };
  mockCustomers[customerIndex] = customer;
  return Promise.resolve({ customer, userErrors: [] });
}
