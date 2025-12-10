/**
 * GraphQL input mappers for drizzle-query.
 *
 * Maps GraphQL filter/order inputs to drizzle-query format with validation.
 *
 * @example
 * ```ts
 * import { createGraphQLMapper } from "@shopana/drizzle-query";
 *
 * const warehouseMapper = createGraphQLMapper({
 *   fields: ["id", "code", "name", "isDefault", "createdAt", "updatedAt"],
 *   // Optional: allowed filter operators per field type
 *   operators: ["$eq", "$neq", "$in", "$contains", "$gt", "$lt"],
 * });
 *
 * // In GraphQL resolver:
 * const results = await warehouseQuery.execute(db, {
 *   where: warehouseMapper.mapWhere(args.where),
 *   order: warehouseMapper.mapOrderBy(args.orderBy),
 * });
 * ```
 */

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when an invalid field is used in filter or order
 */
export class InvalidFieldError extends Error {
  constructor(
    public readonly field: string,
    public readonly allowedFields: string[],
    public readonly context: "where" | "orderBy"
  ) {
    super(
      `Invalid ${context} field "${field}". Allowed fields: ${allowedFields.join(", ")}`
    );
    this.name = "InvalidFieldError";
  }
}

/**
 * Error thrown when an invalid filter operator is used
 */
export class InvalidOperatorError extends Error {
  constructor(
    public readonly operator: string,
    public readonly field: string,
    public readonly allowedOperators: string[]
  ) {
    super(
      `Invalid operator "${operator}" for field "${field}". Allowed operators: ${allowedOperators.join(", ")}`
    );
    this.name = "InvalidOperatorError";
  }
}

// =============================================================================
// Types
// =============================================================================

/**
 * GraphQL OrderByInput structure
 */
export type GraphQLOrderByInput = {
  field: string;
  direction: "ASC" | "DESC";
};

/**
 * GraphQL WhereInput with logical operators
 */
export type GraphQLWhereInput = {
  $and?: GraphQLWhereInput[];
  $or?: GraphQLWhereInput[];
  $not?: GraphQLWhereInput;
  [field: string]: unknown;
};

/**
 * GraphQL ConnectionInput structure (Relay-style pagination)
 */
export type GraphQLConnectionInput = {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: GraphQLWhereInput | null;
  orderBy?: GraphQLOrderByInput[] | null;
};

/**
 * GraphQL QueryInput structure (limit/offset pagination)
 */
export type GraphQLQueryInput = {
  where?: GraphQLWhereInput | null;
  orderBy?: GraphQLOrderByInput[] | null;
  limit?: number | null;
  offset?: number | null;
};

/**
 * Mapper configuration
 */
export type GraphQLMapperConfig = {
  /** Allowed field names (camelCase) */
  fields: string[];
  /** Allowed filter operators (optional, defaults to all) */
  operators?: string[];
};

/**
 * All supported filter operators
 */
const ALL_OPERATORS = [
  "$eq",
  "$neq",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$notIn",
  "$is",
  "$isNot",
  "$contains",
  "$containsi",
  "$notContains",
  "$notContainsi",
  "$startsWith",
  "$startsWithi",
  "$endsWith",
  "$endsWithi",
  "$between",
];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert SCREAMING_SNAKE_CASE to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE
 */
function toScreamingSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

// =============================================================================
// Mapper Factory
// =============================================================================

/**
 * GraphQL input mapper with validation
 */
export type GraphQLMapper = {
  /**
   * Map and validate GraphQL OrderByInput array
   * @throws {InvalidFieldError} if field is not allowed
   */
  mapOrderBy(orderBy: GraphQLOrderByInput[] | null | undefined): string[] | undefined;

  /**
   * Map and validate GraphQL WhereInput
   * @throws {InvalidFieldError} if field is not allowed
   * @throws {InvalidOperatorError} if operator is not allowed
   */
  mapWhere(where: GraphQLWhereInput | null | undefined): GraphQLWhereInput | undefined;

  /**
   * Map and validate GraphQL ConnectionInput (Relay pagination)
   * @throws {InvalidFieldError} if field is not allowed
   * @throws {InvalidOperatorError} if operator is not allowed
   */
  mapConnection(input: GraphQLConnectionInput | null | undefined): {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    where?: GraphQLWhereInput;
    order?: string[];
  } | undefined;

  /**
   * Map and validate GraphQL QueryInput (limit/offset pagination)
   * @throws {InvalidFieldError} if field is not allowed
   * @throws {InvalidOperatorError} if operator is not allowed
   */
  mapQuery(input: GraphQLQueryInput | null | undefined): {
    where?: GraphQLWhereInput;
    order?: string[];
    limit?: number;
    offset?: number;
  } | undefined;

  /** Allowed fields (camelCase) */
  readonly fields: string[];

  /** Allowed fields (SCREAMING_SNAKE_CASE) for GraphQL enum */
  readonly orderFields: string[];

  /** Allowed operators */
  readonly operators: string[];
};

/**
 * Create a GraphQL input mapper with validation
 *
 * @param config - Mapper configuration
 * @returns Mapper instance with validation
 *
 * @example
 * ```ts
 * const warehouseMapper = createGraphQLMapper({
 *   fields: ["id", "code", "name", "isDefault", "createdAt", "updatedAt"],
 * });
 *
 * // In resolver:
 * try {
 *   const results = await warehouseQuery.execute(db, {
 *     where: warehouseMapper.mapWhere(args.where),
 *     order: warehouseMapper.mapOrderBy(args.orderBy),
 *   });
 * } catch (e) {
 *   if (e instanceof InvalidFieldError) {
 *     throw new GraphQLError(e.message, { extensions: { code: "BAD_USER_INPUT" } });
 *   }
 *   throw e;
 * }
 * ```
 */
export function createGraphQLMapper(config: GraphQLMapperConfig): GraphQLMapper {
  const { fields, operators = ALL_OPERATORS } = config;
  const fieldSet = new Set(fields);
  const operatorSet = new Set(operators);
  const orderFields = fields.map(toScreamingSnakeCase);
  const orderFieldSet = new Set(orderFields);

  function validateOrderField(field: string): string {
    // Field comes as SCREAMING_SNAKE_CASE from GraphQL enum
    if (!orderFieldSet.has(field)) {
      throw new InvalidFieldError(field, orderFields, "orderBy");
    }
    return toCamelCase(field);
  }

  function validateWhereField(field: string): void {
    if (!fieldSet.has(field)) {
      throw new InvalidFieldError(field, fields, "where");
    }
  }

  function validateOperator(operator: string, field: string): void {
    if (!operatorSet.has(operator)) {
      throw new InvalidOperatorError(operator, field, operators);
    }
  }

  function mapOrderBy(
    orderBy: GraphQLOrderByInput[] | null | undefined
  ): string[] | undefined {
    if (!orderBy || orderBy.length === 0) {
      return undefined;
    }

    return orderBy.map((item) => {
      const field = validateOrderField(item.field);
      const direction = item.direction.toLowerCase();
      return `${field}:${direction}`;
    });
  }

  function mapWhere(
    where: GraphQLWhereInput | null | undefined
  ): GraphQLWhereInput | undefined {
    if (!where) {
      return undefined;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(where)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Support both _and/_or/_not (GraphQL) and $and/$or/$not (internal)
      if ((key === "$and" || key === "_and") && Array.isArray(value)) {
        const mapped = value
          .map((item) => mapWhere(item as GraphQLWhereInput))
          .filter(Boolean);
        if (mapped.length > 0) {
          result.$and = mapped;
        }
      } else if ((key === "$or" || key === "_or") && Array.isArray(value)) {
        const mapped = value
          .map((item) => mapWhere(item as GraphQLWhereInput))
          .filter(Boolean);
        if (mapped.length > 0) {
          result.$or = mapped;
        }
      } else if ((key === "$not" || key === "_not") && typeof value === "object") {
        const mapped = mapWhere(value as GraphQLWhereInput);
        if (mapped) {
          result.$not = mapped;
        }
      } else if (typeof value === "object" && value !== null) {
        // Validate field name
        validateWhereField(key);

        // Validate and filter operators, mapping GraphQL operators to internal format
        const filtered: Record<string, unknown> = {};
        for (const [op, opValue] of Object.entries(value as Record<string, unknown>)) {
          if (opValue !== null && opValue !== undefined) {
            // Map _eq to $eq, etc.
            const internalOp = op.startsWith("_") ? `$${op.slice(1)}` : op;
            validateOperator(internalOp, key);
            filtered[internalOp] = opValue;
          }
        }

        if (Object.keys(filtered).length > 0) {
          result[key] = filtered;
        }
      } else {
        // Direct value (shorthand for $eq)
        validateWhereField(key);
        result[key] = value;
      }
    }

    return Object.keys(result).length > 0 ? (result as GraphQLWhereInput) : undefined;
  }

  function mapConnection(
    input: GraphQLConnectionInput | null | undefined
  ): {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    where?: GraphQLWhereInput;
    order?: string[];
  } | undefined {
    if (!input) {
      return undefined;
    }

    return {
      ...(input.first != null && { first: input.first }),
      ...(input.after != null && { after: input.after }),
      ...(input.last != null && { last: input.last }),
      ...(input.before != null && { before: input.before }),
      ...(input.where && { where: mapWhere(input.where) }),
      ...(input.orderBy && { order: mapOrderBy(input.orderBy) }),
    };
  }

  function mapQuery(
    input: GraphQLQueryInput | null | undefined
  ): {
    where?: GraphQLWhereInput;
    order?: string[];
    limit?: number;
    offset?: number;
  } | undefined {
    if (!input) {
      return undefined;
    }

    return {
      ...(input.where && { where: mapWhere(input.where) }),
      ...(input.orderBy && { order: mapOrderBy(input.orderBy) }),
      ...(input.limit != null && { limit: input.limit }),
      ...(input.offset != null && { offset: input.offset }),
    };
  }

  return {
    mapOrderBy,
    mapWhere,
    mapConnection,
    mapQuery,
    fields,
    orderFields,
    operators,
  };
}

// =============================================================================
// Standalone functions (without validation)
// =============================================================================

/**
 * Map GraphQL OrderByInput array to drizzle-query order format (no validation)
 *
 * @param orderBy - GraphQL orderBy input array
 * @returns drizzle-query order array (e.g., ["createdAt:desc", "name:asc"])
 */
export function mapOrderBy(
  orderBy: GraphQLOrderByInput[] | null | undefined
): string[] | undefined {
  if (!orderBy || orderBy.length === 0) {
    return undefined;
  }

  return orderBy.map((item) => {
    const field = toCamelCase(item.field);
    const direction = item.direction.toLowerCase();
    return `${field}:${direction}`;
  });
}

/**
 * Map single GraphQL OrderByInput to drizzle-query order string (no validation)
 */
export function mapOrderByItem(orderBy: GraphQLOrderByInput): string {
  const field = toCamelCase(orderBy.field);
  const direction = orderBy.direction.toLowerCase();
  return `${field}:${direction}`;
}

/**
 * Map GraphQL WhereInput to drizzle-query where format (no validation)
 */
export function mapWhereInput<T extends GraphQLWhereInput>(
  where: T | null | undefined
): T | undefined {
  if (!where) {
    return undefined;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(where)) {
    if (value === null || value === undefined) {
      continue;
    }

    // Support both _and/_or/_not (GraphQL) and $and/$or/$not (internal)
    if ((key === "$and" || key === "_and") && Array.isArray(value)) {
      const mapped = value
        .map((item) => mapWhereInput(item as GraphQLWhereInput))
        .filter(Boolean);
      if (mapped.length > 0) {
        result.$and = mapped;
      }
    } else if ((key === "$or" || key === "_or") && Array.isArray(value)) {
      const mapped = value
        .map((item) => mapWhereInput(item as GraphQLWhereInput))
        .filter(Boolean);
      if (mapped.length > 0) {
        result.$or = mapped;
      }
    } else if ((key === "$not" || key === "_not") && typeof value === "object") {
      const mapped = mapWhereInput(value as GraphQLWhereInput);
      if (mapped) {
        result.$not = mapped;
      }
    } else if (typeof value === "object" && value !== null) {
      const filtered = filterNullValues(value as Record<string, unknown>);
      if (Object.keys(filtered).length > 0) {
        result[key] = filtered;
      }
    } else {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? (result as T) : undefined;
}

function filterNullValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      // Map GraphQL operators (_eq, _neq, etc.) to internal format ($eq, $neq, etc.)
      const mappedKey = key.startsWith("_") ? `$${key.slice(1)}` : key;
      result[mappedKey] = value;
    }
  }

  return result;
}

/**
 * Map GraphQL ConnectionInput to drizzle-query RelayInput format (no validation)
 */
export function mapConnectionInput(
  input: GraphQLConnectionInput | null | undefined
): {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  where?: GraphQLWhereInput;
  order?: string[];
} | undefined {
  if (!input) {
    return undefined;
  }

  return {
    ...(input.first != null && { first: input.first }),
    ...(input.after != null && { after: input.after }),
    ...(input.last != null && { last: input.last }),
    ...(input.before != null && { before: input.before }),
    ...(input.where && { where: mapWhereInput(input.where) }),
    ...(input.orderBy && { order: mapOrderBy(input.orderBy) }),
  };
}

/**
 * Map GraphQL QueryInput to drizzle-query ExecuteOptions format (no validation)
 */
export function mapQueryInput(
  input: GraphQLQueryInput | null | undefined
): {
  where?: GraphQLWhereInput;
  order?: string[];
  limit?: number;
  offset?: number;
} | undefined {
  if (!input) {
    return undefined;
  }

  return {
    ...(input.where && { where: mapWhereInput(input.where) }),
    ...(input.orderBy && { order: mapOrderBy(input.orderBy) }),
    ...(input.limit != null && { limit: input.limit }),
    ...(input.offset != null && { offset: input.offset }),
  };
}
