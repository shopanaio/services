import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  parse,
  type GraphQLNamedType,
  type GraphQLSchema,
} from "graphql";
import { gql } from "graphql-tag";
import { adminOrderCommandNames } from "../../../domain/admin/AdminOrderCommandContracts.js";
import { OrderEditSessionResolver } from "../../../resolvers/admin/EditSessionResolver.js";
import { OrdersMutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { OrderOperationResolver } from "../../../resolvers/admin/OperationResolver.js";
import { OrderResolver } from "../../../resolvers/admin/OrderResolver.js";
import * as generatedSchemas from "../schemas.js";

const schemaDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(schemaDirectory, "../../../../../..");
const sharedSchemaPaths = [
  "packages/admin-graphql/graphql/foundation.graphql",
  "packages/shared-references/graphql/shared-currency.graphql",
  "packages/shared-references/graphql/shared-locale.graphql",
  "packages/shared-references/graphql/shared-units.graphql",
] as const;
const localSchemaPaths = readdirSync(schemaDirectory)
  .filter((name) => name.endsWith(".graphql"))
  .sort()
  .map((name) => resolve(schemaDirectory, name));

function readContractSources(): string[] {
  return [
    ...sharedSchemaPaths.map((path) => readFileSync(resolve(repositoryRoot, path), "utf8")),
    ...localSchemaPaths.map((path) => readFileSync(path, "utf8")),
  ];
}

function buildOrdersAdminSchema(): GraphQLSchema {
  return buildSubgraphSchema({
    typeDefs: gql(readContractSources().join("\n")),
  });
}

function collectReachableTypeNames(schema: GraphQLSchema): Set<string> {
  const reachable = new Set<string>();
  const queue: GraphQLNamedType[] = [];
  const query = schema.getQueryType();
  const mutation = schema.getMutationType();
  if (query) queue.push(query);
  if (mutation) queue.push(mutation);

  while (queue.length > 0) {
    const type = queue.shift();
    if (!type || reachable.has(type.name)) continue;
    reachable.add(type.name);

    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        queue.push(getNamedType(field.type));
        for (const argument of field.args) queue.push(getNamedType(argument.type));
      }
      if (isInterfaceType(type)) {
        for (const implementation of schema.getPossibleTypes(type)) queue.push(implementation);
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) queue.push(getNamedType(field.type));
    } else if (isUnionType(type)) {
      queue.push(...type.getTypes());
    }
  }

  return reachable;
}

function localDefinedTypeNames(): string[] {
  return localSchemaPaths.flatMap((path) =>
    parse(readFileSync(path, "utf8")).definitions.flatMap((definition) => {
      if (
        definition.kind === "ObjectTypeDefinition" ||
        definition.kind === "InterfaceTypeDefinition" ||
        definition.kind === "InputObjectTypeDefinition" ||
        definition.kind === "EnumTypeDefinition"
      ) {
        return [definition.name.value];
      }
      return [];
    }),
  );
}

describe("Orders Admin GraphQL contract", () => {
  const schema = buildOrdersAdminSchema();

  test("has no orphan local types", () => {
    const reachable = collectReachableTypeNames(schema);
    expect(localDefinedTypeNames().filter((name) => !reachable.has(name))).toEqual([]);
  });

  test("uses consistent payload and user error contracts", () => {
    const mutation = schema.getMutationType();
    expect(mutation).toBeDefined();

    for (const field of Object.values(mutation?.getFields() ?? {})) {
      const namespaceType = getNamedType(field.type);
      if (namespaceType.name !== "OrdersMutation" || !isObjectType(namespaceType)) continue;

      for (const operation of Object.values(namespaceType.getFields())) {
        const payload = getNamedType(operation.type);
        expect(payload.name.endsWith("Payload")).toBe(true);
        expect(isObjectType(payload)).toBe(true);
        if (!isObjectType(payload)) continue;

        const userErrors = payload.getFields().userErrors;
        expect(userErrors).toBeDefined();
        expect(String(userErrors.type)).toBe("[OrderUserError!]!");
      }
    }

    const errorType = schema.getType("OrderUserError");
    expect(isObjectType(errorType)).toBe(true);
    if (isObjectType(errorType)) {
      expect(errorType.getInterfaces().map((item) => item.name)).toContain("DisplayableError");
    }
  });

  test("requires idempotency and optimistic concurrency inputs", () => {
    const namespace = schema.getType("OrdersMutation");
    expect(isObjectType(namespace)).toBe(true);
    if (!isObjectType(namespace)) return;

    const concurrencyExempt = new Set(["orderCreate", "ordersBulkAction"]);
    for (const operation of Object.values(namespace.getFields())) {
      expect(operation.args.map((argument) => argument.name)).toEqual(["input"]);
      const input = getNamedType(operation.args[0].type);
      expect(isInputObjectType(input)).toBe(true);
      if (!isInputObjectType(input)) continue;

      expect(String(input.getFields().idempotencyKey?.type)).toBe("String!");
      if (concurrencyExempt.has(operation.name)) continue;

      const concurrencyFields = ["expectedVersion", "expectedEditVersion", "expectedOrderVersion"];
      expect(concurrencyFields.some((name) => input.getFields()[name] !== undefined)).toBe(true);
    }
  });

  test("maps every Orders Node type to the Global ID registry", () => {
    const registrySource = readFileSync(
      resolve(repositoryRoot, "packages/shared-graphql-guid/src/core.ts"),
      "utf8",
    );
    const registeredTypes = new Set(
      [...registrySource.matchAll(/^\s+(\w+) = "\1",$/gm)].map((match) => match[1]),
    );
    const node = schema.getType("Node");
    expect(isInterfaceType(node)).toBe(true);
    if (!isInterfaceType(node)) return;

    const localTypes = new Set(localDefinedTypeNames());
    const missing = schema
      .getPossibleTypes(node)
      .map((type) => type.name)
      .filter((name) => localTypes.has(name) && !registeredTypes.has(name));
    expect(missing).toEqual([]);
  });

  test("does not publish deprecated fields in the new V1 contract", () => {
    const deprecated: string[] = [];
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) && !isInterfaceType(type)) continue;
      for (const field of Object.values(type.getFields())) {
        if (field.deprecationReason !== undefined) deprecated.push(`${type.name}.${field.name}`);
      }
    }
    expect(deprecated).toEqual([]);
  });

  test("maps every Admin UI write capability to an explicit command", () => {
    const namespace = schema.getType("OrdersMutation");
    expect(isObjectType(namespace)).toBe(true);
    if (!isObjectType(namespace)) return;

    const operations = new Set(Object.keys(namespace.getFields()));
    const requiredMappings = [
      "orderCreate",
      "orderUpdate",
      "orderDelete",
      "orderCompleteDraft",
      "orderCancel",
      "orderClose",
      "orderReopen",
      "orderArchive",
      "orderUnarchive",
      "orderCustomerSet",
      "orderTagsUpdate",
      "orderAdminNoteUpdate",
      "orderCommentAdd",
      "orderLineAdd",
      "orderLineUpdate",
      "orderLineDelete",
      "orderEditBegin",
      "orderEditCommit",
      "orderManualPaymentRecord",
      "orderPaymentCapture",
      "orderPaymentVoid",
      "orderPaymentRetry",
      "orderRefundCreate",
      "orderPaymentStatusOverride",
      "fulfillmentOrderSplit",
      "fulfillmentOrderHold",
      "fulfillmentOrderReleaseHold",
      "fulfillmentCreate",
      "fulfillmentCancel",
      "shipmentCreate",
      "shipmentTrackingUpdate",
      "shipmentMarkShipped",
      "shipmentMarkDelivered",
    ];
    expect(requiredMappings.filter((operation) => !operations.has(operation))).toEqual([]);
  });

  test("binds every command to a resolver and its generated boundary schema", () => {
    const namespace = schema.getType("OrdersMutation");
    expect(isObjectType(namespace)).toBe(true);
    if (!isObjectType(namespace)) return;

    expect(Object.keys(namespace.getFields()).sort()).toEqual([...adminOrderCommandNames].sort());
    for (const command of adminOrderCommandNames) {
      const schemaFactory = `Api${command[0]?.toUpperCase()}${command.slice(1)}InputSchema`;
      expect(typeof OrdersMutationResolver.prototype[command]).toBe("function");
      expect(typeof (generatedSchemas as Record<string, unknown>)[schemaFactory]).toBe("function");
    }
  });

  test("implements every aggregate, edit-session, and operation field", () => {
    const implementations = [
      ["Order", OrderResolver.prototype],
      ["OrderEditSession", OrderEditSessionResolver.prototype],
      ["OrderOperation", OrderOperationResolver.prototype],
    ] as const;

    for (const [typeName, prototype] of implementations) {
      const type = schema.getType(typeName);
      expect(isObjectType(type)).toBe(true);
      if (!isObjectType(type)) continue;
      for (const field of Object.keys(type.getFields())) {
        expect(typeof (prototype as unknown as Record<string, unknown>)[field]).toBe("function");
      }
    }
  });

  test("keeps filter enum types closed and documented", () => {
    for (const name of [
      "OrderStatus",
      "OrderPaymentStatus",
      "OrderFulfillmentStatus",
      "OrderDeliveryStatus",
      "OrderReturnStatus",
    ]) {
      const type = schema.getType(name);
      expect(isEnumType(type)).toBe(true);
      if (isEnumType(type)) {
        expect(type.description).toBeTruthy();
        expect(type.getValues().every((value) => Boolean(value.description))).toBe(true);
      }
    }
  });
});
