import type { CustomersKernelServices } from "../../../kernel/types.js";
import { CustomerSegmentUpdateScript } from "../CustomerSegmentUpdateScript.js";

describe("CustomerSegmentUpdateScript definition revision", () => {
  it("compares JSON structurally rather than by object key insertion order", async () => {
    const updateWithMemberships = jest.fn(async () => ({
      segment: current,
      affectedCustomerIds: [],
    }));
    const script = createScript(updateWithMemberships);

    await script.run({
      id: current.id,
      expectedRevision: current.revision,
      operations: {
        definition: { definition: { nested: { a: 1, b: 2 }, z: true } },
      },
    });

    expect(updateWithMemberships.mock.calls[0]?.[4]).toBe(false);
  });

  it("marks type, query or structural definition changes", async () => {
    const updateWithMemberships = jest.fn(async () => ({
      segment: current,
      affectedCustomerIds: [],
    }));
    const script = createScript(updateWithMemberships);

    await script.run({
      id: current.id,
      expectedRevision: current.revision,
      operations: { definition: { query: "country = UA" } },
    });

    expect(updateWithMemberships.mock.calls[0]?.[4]).toBe(true);
  });
});

const current = {
  id: "segment-1",
  storeId: "store-1",
  name: "Customers",
  description: null,
  color: null,
  type: "DYNAMIC" as const,
  status: "ACTIVE" as const,
  query: "country = US",
  definition: { z: true, nested: { b: 2, a: 1 } },
  createdById: null,
  revision: 3,
  definitionRevision: 2,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  deletedAt: null,
};

function createScript(updateWithMemberships: jest.Mock) {
  const services = {
    repository: {
      segment: {
        findById: jest.fn(async () => current),
        updateWithMemberships,
      },
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  } as unknown as CustomersKernelServices;
  return new CustomerSegmentUpdateScript(services);
}
