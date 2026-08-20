import { decodeGlobalId, GLOBAL_ID_NAMESPACE } from "@shopana/shared-graphql-guid";
import { SEGMENT_DIAGNOSTIC_CODES, SEGMENT_DSL_LIMITS, SEGMENT_DSL_VERSION } from "./constants.js";
import { currencyMinorUnitDigits } from "./currency.js";
import {
  calendarDayDistance,
  localDateTimeToUtc,
  parseCalendarDate,
  resolveDateValue,
  validateDateTime,
} from "./date-time.js";
import { parseSegmentQuery, SegmentParseError } from "./generated-parser.js";
import { printSegmentQuery } from "./printer.js";
import { asciiLower, SegmentRegistry } from "./registry.js";
import { SegmentDefinitionV1Schema } from "./schemas.js";
import type {
  ParsedExpression,
  ParsedFunctionExpression,
  ParsedFunctionParameter,
  ParsedPredicateExpression,
  ParsedValue,
  SegmentAttributeDescriptor,
  SegmentContextDependency,
  SegmentDefinitionV1,
  SegmentDependency,
  SegmentDiagnostic,
  SegmentEntityReference,
  SegmentExpression,
  SegmentFunctionDescriptor,
  SegmentFunctionExpression,
  SegmentFunctionParameter,
  SegmentFunctionParameterDescriptor,
  SegmentPredicateExpression,
  SegmentSemanticOptions,
  SegmentSourceRange,
  SegmentStoreEvaluationContext,
  SegmentValidationResult,
  SegmentValue,
  SegmentValueDescriptor,
} from "./types.js";

const INT64_MIN = -(1n << 63n);
const INT64_MAX = (1n << 63n) - 1n;

interface AnalysisState {
  readonly source: string;
  readonly registry: SegmentRegistry;
  readonly options: SegmentSemanticOptions;
  readonly effectiveAt: string;
  readonly diagnostics: SegmentDiagnostic[];
  readonly dependencies: Set<SegmentDependency>;
  readonly contextDependencies: Set<SegmentContextDependency>;
  readonly entityReferences: SegmentEntityReference[];
  readonly entityReferenceKeys: Set<string>;
  leafCount: number;
  complexity: number;
  temporal: boolean;
  logicalDepth: number;
}

export async function validateSegmentQuery(
  query: string,
  registry: SegmentRegistry,
  options: SegmentSemanticOptions & { readonly effectiveAt?: string },
): Promise<SegmentValidationResult> {
  let parsed;
  try {
    parsed = parseSegmentQuery(query);
  } catch (error) {
    if (error instanceof SegmentParseError) {
      return {
        valid: false,
        canonicalQuery: null,
        definition: null,
        complexity: null,
        diagnostics: [error.diagnostic],
      };
    }
    throw error;
  }

  validateStoreContext(options.storeContext);
  const state: AnalysisState = {
    source: query,
    registry,
    options,
    effectiveAt: options.effectiveAt ?? new Date().toISOString(),
    diagnostics: [],
    dependencies: new Set(),
    contextDependencies: new Set(),
    entityReferences: [],
    entityReferenceKeys: new Set(),
    leafCount: 0,
    complexity: 0,
    temporal: false,
    logicalDepth: 0,
  };
  const root = analyzeExpression(parsed.root, state, 0);

  if (state.entityReferences.length > 0) {
    if (!options.entityExists) {
      for (const reference of state.entityReferences) {
        diagnostic(
          state,
          SEGMENT_DIAGNOSTIC_CODES.entityId,
          "Entity reference could not be verified",
          reference.range,
        );
      }
    } else {
      const existing = await options.entityExists(
        options.storeContext.storeId,
        state.entityReferences,
      );
      for (const reference of state.entityReferences) {
        const key = entityReferenceKey(reference.entity, reference.id);
        if (!existing.has(key) && !existing.has(reference.id)) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.entityId,
            "Entity reference is invalid for this Store",
            reference.range,
            {
              entity: reference.entity,
            },
          );
        }
      }
    }
  }

  enforceComplexity(state, parsed.root.range);
  const hasErrors = state.diagnostics.some((item) => item.severity === "ERROR");
  const diagnostics = finalizeDiagnostics(state.diagnostics, query);
  const valid = !hasErrors && root !== null;
  if (!valid || !root) {
    return {
      valid: false,
      canonicalQuery: null,
      definition: null,
      complexity: state.complexity,
      diagnostics,
    };
  }

  const definition: SegmentDefinitionV1 = {
    version: SEGMENT_DSL_VERSION,
    root,
    dependencies: [...state.dependencies].sort(asciiCompare),
    contextDependencies: [...state.contextDependencies].sort(asciiCompare),
    evaluationContext: {
      currencyCode: options.storeContext.currencyCode.toUpperCase(),
      timeZone: options.storeContext.timeZone,
      storeConfigurationRevision: options.storeContext.configurationRevision,
    },
    temporal: state.temporal,
  };
  SegmentDefinitionV1Schema.parse(definition);
  return {
    valid: true,
    canonicalQuery: printSegmentQuery(root),
    definition,
    complexity: state.complexity,
    diagnostics,
  };
}

export function validatePersistedSegmentDefinition(
  input: unknown,
  registry: SegmentRegistry,
  trustedContext?: SegmentStoreEvaluationContext,
): SegmentDefinitionV1 {
  const definition = SegmentDefinitionV1Schema.parse(input);
  assertPersistedRegistryContract(definition, registry);
  const derived = deriveMetadata(definition.root, registry);
  if (!equalArrays(definition.dependencies, derived.dependencies)) {
    throw new Error("Segment definition dependency metadata is corrupt");
  }
  if (!equalArrays(definition.contextDependencies, derived.contextDependencies)) {
    throw new Error("Segment definition context dependency metadata is corrupt");
  }
  if (definition.temporal !== derived.temporal) {
    throw new Error("Segment definition temporal metadata is corrupt");
  }
  forEachValue(definition.root, (value) => {
    if (
      value.kind === "money" &&
      value.currencyCode !== definition.evaluationContext.currencyCode
    ) {
      throw new Error("Segment definition money context is corrupt");
    }
  });
  if (trustedContext) assertSegmentEvaluationContext(definition, trustedContext);
  return definition;
}

export function assertSegmentEvaluationContext(
  definition: SegmentDefinitionV1,
  trustedContext: SegmentStoreEvaluationContext,
): void {
  if (
    definition.contextDependencies.includes("currency") &&
    definition.evaluationContext.currencyCode !== trustedContext.currencyCode.toUpperCase()
  ) {
    throw new Error("SEGMENT_EVALUATION_CONTEXT_STALE");
  }
  if (
    definition.contextDependencies.includes("timezone") &&
    definition.evaluationContext.timeZone !== trustedContext.timeZone
  ) {
    throw new Error("SEGMENT_EVALUATION_CONTEXT_STALE");
  }
}

function analyzeExpression(
  expression: ParsedExpression,
  state: AnalysisState,
  logicalDepth: number,
): SegmentExpression | null {
  if (expression.kind === "logical") {
    const nextDepth = logicalDepth + 1;
    state.logicalDepth = Math.max(state.logicalDepth, nextDepth);
    if (nextDepth > SEGMENT_DSL_LIMITS.logicalNestingDepth) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.complexity,
        `Logical nesting exceeds ${SEGMENT_DSL_LIMITS.logicalNestingDepth}`,
        expression.range,
      );
    }
    const analyzed = expression.children
      .map((child) => analyzeExpression(child, state, nextDepth))
      .filter((child): child is SegmentExpression => child !== null);
    if (expression.operator === "or") state.complexity += Math.max(0, analyzed.length - 1);
    if (analyzed.length === 0) return null;
    const flattened = analyzed.flatMap((child) =>
      child.kind === "logical" && child.operator === expression.operator
        ? [...child.children]
        : [child],
    );
    if (flattened.length === 1) return flattened[0]!;
    return {
      kind: "logical",
      operator: expression.operator,
      children: flattened as [SegmentExpression, SegmentExpression, ...SegmentExpression[]],
    };
  }
  if (expression.kind === "not") {
    const child = analyzeExpression(expression.child, state, logicalDepth);
    if (!child) return null;
    return child.kind === "not" ? child.child : { kind: "not", child };
  }
  state.leafCount += 1;
  return expression.kind === "function"
    ? analyzeFunction(expression, state)
    : analyzePredicate(expression, state);
}

function analyzePredicate(
  expression: ParsedPredicateExpression,
  state: AnalysisState,
): SegmentPredicateExpression | SegmentFunctionExpression | null {
  const name = asciiLower(expression.attribute);
  const descriptor = state.registry.get(name);
  if (!descriptor) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.unknownAttribute,
      `Unknown segment attribute ${expression.attribute}`,
      expression.attributeRange,
    );
    return null;
  }
  if (descriptor.kind === "FUNCTION") {
    if (expression.operator !== "is_null" && expression.operator !== "is_not_null") {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.operator,
        `${name} is a function and requires MATCHES`,
        expression.range,
      );
      return null;
    }
    return analyzeFunction(
      {
        kind: "function",
        name,
        nameRange: expression.attributeRange,
        operator: expression.operator,
        range: expression.range,
      },
      state,
    );
  }
  if (!available(descriptor, expression.range, state)) return null;
  if (!descriptor.operators.includes(expression.operator)) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.operator,
      `${expression.operator} is not supported for ${name}`,
      expression.range,
    );
    return null;
  }
  if (
    (expression.operator === "is_null" || expression.operator === "is_not_null") &&
    !descriptor.nullable
  ) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.operator,
      `${name} is not nullable`,
      expression.range,
    );
    return null;
  }

  applyDescriptorMetadata(descriptor, expression, state);
  state.complexity += descriptor.complexityCost;
  if (expression.operator === "is_null" || expression.operator === "is_not_null") {
    return { kind: "predicate", attribute: name, operator: expression.operator };
  }
  if (expression.operator === "in" || expression.operator === "not_in") {
    const normalized = (expression.values ?? [])
      .map((value) => normalizeValue(value, descriptor, state))
      .filter((value): value is SegmentValue => value !== null);
    const values = deduplicateValues(normalized);
    if (values.length === 0) return null;
    return {
      kind: "predicate",
      attribute: name,
      operator: expression.operator,
      values: values as [SegmentValue, ...SegmentValue[]],
    };
  }
  if (expression.operator === "between") {
    const value = expression.value ? normalizeValue(expression.value, descriptor, state) : null;
    const upperValue = expression.upperValue
      ? normalizeValue(expression.upperValue, descriptor, state)
      : null;
    if (!value || !upperValue) return null;
    validateRange(name, value, upperValue, expression.range, descriptor, state);
    return { kind: "predicate", attribute: name, operator: "between", value, upperValue };
  }
  const value = expression.value ? normalizeValue(expression.value, descriptor, state) : null;
  if (!value) return null;
  return {
    kind: "predicate",
    attribute: name,
    operator: expression.operator,
    value,
  } as SegmentPredicateExpression;
}

function analyzeFunction(
  expression: ParsedFunctionExpression,
  state: AnalysisState,
): SegmentFunctionExpression | null {
  const name = asciiLower(expression.name);
  const descriptor = state.registry.function(name);
  if (!descriptor) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.unknownAttribute,
      `Unknown segment function ${expression.name}`,
      expression.nameRange,
    );
    return null;
  }
  if (!available(descriptor, expression.range, state)) return null;
  if (!descriptor.operators.includes(expression.operator)) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.operator,
      `${expression.operator} is not supported for ${name}`,
      expression.range,
    );
    return null;
  }
  applyDescriptorMetadata(descriptor, expression, state);
  const byName = new Map(
    descriptor.parameters.map((parameter, index) => [parameter.name, { parameter, index }]),
  );
  const seen = new Set<string>();
  const parameters: { value: SegmentFunctionParameter; order: number }[] = [];
  for (const parsed of expression.parameters ?? []) {
    const parameterName = asciiLower(parsed.name);
    const registered = byName.get(parameterName);
    if (!registered) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.unknownAttribute,
        `Unknown parameter ${name}.${parsed.name}`,
        parsed.nameRange,
      );
      continue;
    }
    if (seen.has(parameterName)) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.duplicateParameter,
        `Parameter ${parameterName} is repeated`,
        parsed.nameRange,
      );
      continue;
    }
    seen.add(parameterName);
    const parameter = analyzeFunctionParameter(parsed, registered.parameter, state);
    if (parameter) parameters.push({ value: parameter, order: registered.index });
  }
  state.complexity += parameters.some(({ value }) => byName.get(value.name)?.parameter.aggregate)
    ? 5
    : descriptor.complexityCost;
  if (expression.operator === "is_null" || expression.operator === "is_not_null") {
    return { kind: "function", name, operator: expression.operator };
  }
  parameters.sort((left, right) => left.order - right.order);
  return {
    kind: "function",
    name,
    operator: expression.operator,
    parameters: parameters.map(({ value }) => value),
  };
}

function analyzeFunctionParameter(
  parsed: ParsedFunctionParameter,
  descriptor: SegmentFunctionParameterDescriptor,
  state: AnalysisState,
): SegmentFunctionParameter | null {
  if (!descriptor.operators.includes(parsed.operator)) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.operator,
      `${parsed.operator} is not supported for parameter ${descriptor.name}`,
      parsed.range,
    );
    return null;
  }
  if (parsed.operator === "is_null" || parsed.operator === "is_not_null") {
    if (!descriptor.nullable || descriptor.aggregate) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.operator,
        `${descriptor.name} does not support NULL checks`,
        parsed.range,
      );
      return null;
    }
    return { name: descriptor.name, operator: parsed.operator };
  }
  if (parsed.operator === "in" || parsed.operator === "not_in") {
    const values = deduplicateValues(
      (parsed.values ?? [])
        .map((value) => normalizeValue(value, descriptor, state))
        .filter((value): value is SegmentValue => value !== null),
    );
    return values.length > 0
      ? {
          name: descriptor.name,
          operator: parsed.operator,
          values: values as [SegmentValue, ...SegmentValue[]],
        }
      : null;
  }
  if (parsed.operator === "between") {
    const value = parsed.value ? normalizeValue(parsed.value, descriptor, state) : null;
    const upperValue = parsed.upperValue
      ? normalizeValue(parsed.upperValue, descriptor, state)
      : null;
    if (!value || !upperValue) return null;
    validateRange(descriptor.name, value, upperValue, parsed.range, descriptor, state);
    return { name: descriptor.name, operator: "between", value, upperValue };
  }
  const value = parsed.value ? normalizeValue(parsed.value, descriptor, state) : null;
  return value ? { name: descriptor.name, operator: parsed.operator, value } : null;
}

function normalizeValue(
  parsed: ParsedValue,
  descriptor: SegmentValueDescriptor,
  state: AnalysisState,
): SegmentValue | null {
  try {
    switch (descriptor.type) {
      case "String": {
        if (parsed.kind !== "string") return typeMismatch(parsed, descriptor, state);
        const value = descriptor.normalizeString?.(parsed.value) ?? parsed.value;
        if ([...value].length > SEGMENT_DSL_LIMITS.stringCodePoints) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.complexity,
            `Normalized string exceeds ${SEGMENT_DSL_LIMITS.stringCodePoints} Unicode code points`,
            parsed.range,
          );
          return null;
        }
        return { kind: "string", value };
      }
      case "Enum": {
        if (parsed.kind !== "string") return typeMismatch(parsed, descriptor, state);
        const value = parsed.value.toUpperCase();
        if (!descriptor.enumValues?.includes(value)) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.enum,
            `Invalid enum value ${parsed.value}`,
            parsed.range,
            {
              allowed: descriptor.enumValues ?? [],
            },
          );
          return null;
        }
        return { kind: "enum", value };
      }
      case "Boolean":
        return parsed.kind === "boolean"
          ? { kind: "boolean", value: parsed.value }
          : typeMismatch(parsed, descriptor, state);
      case "Integer": {
        if (parsed.kind !== "number" || parsed.value.includes("."))
          return typeMismatch(parsed, descriptor, state);
        const integer = BigInt(parsed.value);
        if (
          integer < INT64_MIN ||
          integer > INT64_MAX ||
          (descriptor.nonNegative && integer < 0n)
        ) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.type,
            "Integer is outside the allowed domain",
            parsed.range,
          );
          return null;
        }
        return { kind: "integer", value: integer.toString() };
      }
      case "Decimal": {
        if (parsed.kind !== "number") return typeMismatch(parsed, descriptor, state);
        const decimal = normalizeDecimal(parsed.value, parsed.range, state);
        if (decimal === null) return null;
        if (descriptor.nonNegative && decimal.startsWith("-")) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.type,
            "Decimal must be non-negative",
            parsed.range,
          );
          return null;
        }
        return { kind: "decimal", value: decimal };
      }
      case "Money": {
        if (parsed.kind !== "number") return typeMismatch(parsed, descriptor, state);
        const decimal = normalizeDecimal(
          parsed.value,
          parsed.range,
          state,
          SEGMENT_DIAGNOSTIC_CODES.money,
        );
        if (decimal === null || (descriptor.nonNegative && decimal.startsWith("-"))) {
          if (decimal?.startsWith("-"))
            diagnostic(
              state,
              SEGMENT_DIAGNOSTIC_CODES.money,
              "Money must be non-negative",
              parsed.range,
            );
          return null;
        }
        const exponent = currencyMinorUnitDigits(state.options.storeContext.currencyCode);
        const minor = decimalToMinor(decimal, exponent);
        if (minor === null || minor < INT64_MIN || minor > INT64_MAX) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.money,
            "Money cannot be represented exactly in Store currency",
            parsed.range,
          );
          return null;
        }
        state.contextDependencies.add("currency");
        return {
          kind: "money",
          decimal: formatMinor(minor, exponent),
          minor: minor.toString(),
          currencyCode: state.options.storeContext.currencyCode.toUpperCase(),
        };
      }
      case "Date":
        return normalizeDate(parsed, descriptor, state);
      case "DateTime": {
        if (parsed.kind !== "dateTime") return typeMismatch(parsed, descriptor, state);
        if (!validateDateTime(parsed.value)) {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.date,
            "Invalid date-time literal",
            parsed.range,
          );
          return null;
        }
        if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(parsed.value)) {
          state.contextDependencies.add("timezone");
          const resolved = localDateTimeToUtc(parsed.value, state.options.storeContext.timeZone);
          if (!resolved) {
            diagnostic(
              state,
              SEGMENT_DIAGNOSTIC_CODES.date,
              "Date-time does not exist in the Store timezone",
              parsed.range,
            );
            return null;
          }
          return { kind: "dateTime", value: resolved };
        }
        return { kind: "dateTime", value: new Date(parsed.value).toISOString() };
      }
      case "ID": {
        if (parsed.kind !== "string" || parsed.value.startsWith("gid://"))
          return typeMismatch(parsed, descriptor, state);
        try {
          const decoded = decodeGlobalId(parsed.value);
          if (
            decoded.namespace !== GLOBAL_ID_NAMESPACE ||
            decoded.typeName !== descriptor.entityType ||
            !isUuidV7(decoded.id)
          )
            throw new Error("invalid");
          const reference = {
            entity: decoded.typeName,
            id: decoded.id.toLowerCase(),
            range: parsed.range,
          };
          state.entityReferences.push(reference);
          state.entityReferenceKeys.add(entityReferenceKey(reference.entity, reference.id));
          return { kind: "entityId", entity: reference.entity, id: reference.id };
        } catch {
          diagnostic(
            state,
            SEGMENT_DIAGNOSTIC_CODES.entityId,
            `Invalid ${descriptor.entityType ?? "entity"} Global ID`,
            parsed.range,
          );
          return null;
        }
      }
    }
  } catch (error) {
    diagnostic(
      state,
      descriptor.type === "Date" || descriptor.type === "DateTime"
        ? SEGMENT_DIAGNOSTIC_CODES.date
        : SEGMENT_DIAGNOSTIC_CODES.type,
      error instanceof Error ? error.message : "Invalid literal value",
      parsed.range,
    );
    return null;
  }
}

function normalizeDate(
  parsed: ParsedValue,
  descriptor: SegmentValueDescriptor,
  state: AnalysisState,
): SegmentValue | null {
  if (parsed.kind === "date") {
    if (!parseCalendarDate(parsed.value)) {
      diagnostic(state, SEGMENT_DIAGNOSTIC_CODES.date, "Invalid calendar date", parsed.range);
      return null;
    }
    state.contextDependencies.add("timezone");
    return { kind: "date", value: parsed.value };
  }
  if (parsed.kind === "dateTime") return typeMismatch(parsed, descriptor, state);
  if (parsed.kind === "namedDate") {
    state.contextDependencies.add("timezone");
    return { kind: "namedDate", value: parsed.value };
  }
  if (parsed.kind === "relativeDate") {
    const match = /^([+-])(0|[1-9]\d*)([dDwWmMyY])$/u.exec(parsed.value)!;
    const magnitude = BigInt(match[2]!);
    const signed = match[1] === "-" ? -magnitude : magnitude;
    if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.date,
        "Relative date is outside the supported range",
        parsed.range,
      );
      return null;
    }
    const amount = Number(signed);
    if (amount > 0 && !descriptor.allowFutureDate) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.date,
        "Future relative dates are not supported for this attribute",
        parsed.range,
      );
      return null;
    }
    state.contextDependencies.add("timezone");
    return {
      kind: "relativeDate",
      amount,
      unit: ({ d: "day", w: "week", m: "month", y: "year" } as const)[
        match[3]!.toLowerCase() as "d" | "w" | "m" | "y"
      ],
    };
  }
  return typeMismatch(parsed, descriptor, state);
}

function validateRange(
  name: string,
  lower: SegmentValue,
  upper: SegmentValue,
  range: SegmentSourceRange,
  descriptor: SegmentValueDescriptor,
  state: AnalysisState,
): void {
  const comparison = compareValues(lower, upper, state);
  if (comparison !== null && comparison > 0) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.dateRange,
      "BETWEEN lower boundary must not be after upper boundary",
      range,
    );
    return;
  }
  if (name === "birthday" && isDateLike(lower) && isDateLike(upper)) {
    const lowerDate = resolveDateValue(
      lower,
      state.effectiveAt,
      state.options.storeContext.timeZone,
    );
    const upperDate = resolveDateValue(
      upper,
      state.effectiveAt,
      state.options.storeContext.timeZone,
    );
    const distance = calendarDayDistance(lowerDate, upperDate);
    if (distance < 0 || distance > 366) {
      diagnostic(
        state,
        SEGMENT_DIAGNOSTIC_CODES.dateRange,
        "Birthday interval must span at most 366 calendar days",
        range,
      );
    }
  }
  void descriptor;
}

function compareValues(
  left: SegmentValue,
  right: SegmentValue,
  state: AnalysisState,
): number | null {
  if (left.kind === "integer" && right.kind === "integer")
    return compareBigInt(BigInt(left.value), BigInt(right.value));
  if (left.kind === "money" && right.kind === "money")
    return compareBigInt(BigInt(left.minor), BigInt(right.minor));
  if (left.kind === "decimal" && right.kind === "decimal")
    return compareScaledDecimal(left.value, right.value);
  if (isDateLike(left) && isDateLike(right)) {
    const distance = calendarDayDistance(
      resolveDateValue(left, state.effectiveAt, state.options.storeContext.timeZone),
      resolveDateValue(right, state.effectiveAt, state.options.storeContext.timeZone),
    );
    return distance === 0 ? 0 : distance > 0 ? -1 : 1;
  }
  return null;
}

function applyDescriptorMetadata(
  descriptor: SegmentAttributeDescriptor | SegmentFunctionDescriptor,
  expression: ParsedPredicateExpression | ParsedFunctionExpression,
  state: AnalysisState,
): void {
  for (const dependency of descriptor.dependencies) state.dependencies.add(dependency);
  const hasRelativeValue = parsedExpressionValues(expression).some(
    (value) => value.kind === "namedDate" || value.kind === "relativeDate",
  );
  if (
    descriptor.temporalContract === "SOURCE" ||
    descriptor.temporalContract === "VALUE_AND_SOURCE" ||
    (descriptor.temporalContract === "VALUE" && hasRelativeValue)
  )
    state.temporal = true;
  if (
    descriptor.dependencies.includes("taxIdentifier") ||
    descriptor.dependencies.includes("taxExemption") ||
    descriptor.name === "birthday"
  )
    state.contextDependencies.add("timezone");
}

function available(
  descriptor: SegmentAttributeDescriptor | SegmentFunctionDescriptor,
  range: SegmentSourceRange,
  state: AnalysisState,
): boolean {
  if (descriptor.availability === "AVAILABLE") return true;
  diagnostic(
    state,
    SEGMENT_DIAGNOSTIC_CODES.unavailable,
    descriptor.unavailabilityReason ?? `${descriptor.name} is unavailable`,
    range,
  );
  return false;
}

function enforceComplexity(state: AnalysisState, range: SegmentSourceRange): void {
  if (state.leafCount > SEGMENT_DSL_LIMITS.leafClauses) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.complexity,
      `Query exceeds ${SEGMENT_DSL_LIMITS.leafClauses} leaf clauses`,
      range,
    );
  }
  if (state.complexity > SEGMENT_DSL_LIMITS.complexity) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.complexity,
      `Query complexity ${state.complexity} exceeds ${SEGMENT_DSL_LIMITS.complexity}`,
      range,
    );
  }
  if (state.entityReferenceKeys.size > SEGMENT_DSL_LIMITS.referencedEntityIds) {
    diagnostic(
      state,
      SEGMENT_DIAGNOSTIC_CODES.complexity,
      `Query exceeds ${SEGMENT_DSL_LIMITS.referencedEntityIds} referenced entity IDs`,
      range,
    );
  }
}

function typeMismatch(
  parsed: ParsedValue,
  descriptor: SegmentValueDescriptor,
  state: AnalysisState,
): null {
  diagnostic(
    state,
    SEGMENT_DIAGNOSTIC_CODES.type,
    `Expected ${descriptor.type} value`,
    parsed.range,
  );
  return null;
}

function diagnostic(
  state: AnalysisState,
  code: string,
  message: string,
  range: SegmentSourceRange,
  details?: Readonly<Record<string, unknown>>,
): void {
  state.diagnostics.push({
    code,
    message,
    severity: "ERROR",
    ...range,
    ...(details ? { details } : {}),
  });
}

function finalizeDiagnostics(
  diagnostics: SegmentDiagnostic[],
  source: string,
): readonly SegmentDiagnostic[] {
  diagnostics.sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      asciiCompare(left.code, right.code),
  );
  if (diagnostics.length <= SEGMENT_DSL_LIMITS.diagnostics) return diagnostics;
  const finalOffset = source.length;
  return [
    ...diagnostics.slice(0, SEGMENT_DSL_LIMITS.diagnostics - 1),
    {
      code: SEGMENT_DIAGNOSTIC_CODES.truncated,
      message: "Additional diagnostics were truncated",
      severity: "WARNING" as const,
      startOffset: finalOffset,
      endOffset: finalOffset,
      line: source.split(/\r\n|\r|\n/u).length,
      column: (source.split(/\r\n|\r|\n/u).at(-1)?.length ?? 0) + 1,
    },
  ];
}

function normalizeDecimal(
  value: string,
  range: SegmentSourceRange,
  state: AnalysisState,
  diagnosticCode: string = SEGMENT_DIAGNOSTIC_CODES.type,
): string | null {
  const negative = value.startsWith("-");
  const unsigned = value.replace(/^[+-]/u, "");
  const [rawInteger, rawFraction = ""] = unsigned.split(".");
  const significant = `${rawInteger}${rawFraction}`.replace(/^0+/u, "").length || 1;
  if (significant > 38 || rawFraction.length > 18) {
    diagnostic(
      state,
      diagnosticCode,
      "Decimal exceeds 38 significant or 18 fractional digits",
      range,
    );
    return null;
  }
  const integer = rawInteger!.replace(/^0+(?=\d)/u, "");
  const fraction = rawFraction.replace(/0+$/u, "");
  const zero = /^0*$/u.test(integer) && fraction.length === 0;
  return `${negative && !zero ? "-" : ""}${integer || "0"}${fraction ? `.${fraction}` : ""}`;
}

function decimalToMinor(decimal: string, exponent: number): bigint | null {
  const negative = decimal.startsWith("-");
  const [integer, fraction = ""] = decimal.replace(/^-/, "").split(".");
  if (fraction.length > exponent) return null;
  const digits = `${integer}${fraction.padEnd(exponent, "0")}`.replace(/^0+(?=\d)/u, "") || "0";
  const value = BigInt(digits);
  return negative ? -value : value;
}

function formatMinor(minor: bigint, exponent: number): string {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString();
  if (exponent === 0) return `${negative ? "-" : ""}${digits}`;
  const padded = digits.padStart(exponent + 1, "0");
  const split = padded.length - exponent;
  return `${negative ? "-" : ""}${padded.slice(0, split)}.${padded.slice(split)}`;
}

function validateStoreContext(context: SegmentStoreEvaluationContext): void {
  if (!/^[A-Z]{3}$/u.test(context.currencyCode.toUpperCase()))
    throw new Error("Invalid Store currencyCode");
  currencyMinorUnitDigits(context.currencyCode);
  if (!Number.isSafeInteger(context.configurationRevision) || context.configurationRevision < 0) {
    throw new Error("Invalid Store configurationRevision");
  }
  new Intl.DateTimeFormat("en", { timeZone: context.timeZone }).format(new Date(0));
}

interface PersistedValidationState {
  readonly definition: SegmentDefinitionV1;
  readonly registry: SegmentRegistry;
  readonly entityReferences: Set<string>;
  nodeCount: number;
  leafCount: number;
  complexity: number;
  logicalDepth: number;
}

function assertPersistedRegistryContract(
  definition: SegmentDefinitionV1,
  registry: SegmentRegistry,
): void {
  if (!Number.isSafeInteger(definition.evaluationContext.storeConfigurationRevision)) {
    throw persistedCorruption("Store configuration revision is unsafe");
  }
  new Intl.DateTimeFormat("en", { timeZone: definition.evaluationContext.timeZone }).format(
    new Date(0),
  );
  const state: PersistedValidationState = {
    definition,
    registry,
    entityReferences: new Set(),
    nodeCount: 0,
    leafCount: 0,
    complexity: 0,
    logicalDepth: 0,
  };
  assertPersistedExpression(definition.root, state, 0);
  if (state.nodeCount > SEGMENT_DSL_LIMITS.rawAstNodes) {
    throw persistedCorruption("Normalized AST node limit is exceeded");
  }
  if (state.leafCount > SEGMENT_DSL_LIMITS.leafClauses) {
    throw persistedCorruption("Leaf clause limit is exceeded");
  }
  if (state.logicalDepth > SEGMENT_DSL_LIMITS.logicalNestingDepth) {
    throw persistedCorruption("Logical nesting limit is exceeded");
  }
  if (state.complexity > SEGMENT_DSL_LIMITS.complexity) {
    throw persistedCorruption("Complexity limit is exceeded");
  }
  if (state.entityReferences.size > SEGMENT_DSL_LIMITS.referencedEntityIds) {
    throw persistedCorruption("Referenced entity limit is exceeded");
  }
}

function assertPersistedExpression(
  expression: SegmentExpression,
  state: PersistedValidationState,
  logicalDepth: number,
): void {
  state.nodeCount += 1;
  if (state.nodeCount > SEGMENT_DSL_LIMITS.rawAstNodes) {
    throw persistedCorruption("Normalized AST node limit is exceeded");
  }
  if (expression.kind === "logical") {
    const nextDepth = logicalDepth + 1;
    state.logicalDepth = Math.max(state.logicalDepth, nextDepth);
    if (nextDepth > SEGMENT_DSL_LIMITS.logicalNestingDepth) {
      throw persistedCorruption("Logical nesting limit is exceeded");
    }
    state.complexity += expression.operator === "or" ? expression.children.length - 1 : 0;
    for (const child of expression.children) {
      if (child.kind === "logical" && child.operator === expression.operator) {
        throw persistedCorruption("Nested identical logical operators are not canonical");
      }
      assertPersistedExpression(child, state, nextDepth);
    }
    return;
  }
  if (expression.kind === "not") {
    if (expression.child.kind === "not")
      throw persistedCorruption("Double negation is not canonical");
    assertPersistedExpression(expression.child, state, logicalDepth);
    return;
  }

  state.leafCount += 1;
  if (state.leafCount > SEGMENT_DSL_LIMITS.leafClauses) {
    throw persistedCorruption("Leaf clause limit is exceeded");
  }
  if (expression.kind === "predicate") {
    const descriptor = state.registry.attribute(expression.attribute);
    if (
      !descriptor ||
      descriptor.name !== expression.attribute ||
      descriptor.availability !== "AVAILABLE"
    )
      throw persistedCorruption(`Invalid attribute ${expression.attribute}`);
    if (!operatorAllowed(descriptor.operators, expression.operator)) {
      throw persistedCorruption(`Invalid operator for ${expression.attribute}`);
    }
    if (
      (expression.operator === "is_null" || expression.operator === "is_not_null") &&
      !descriptor.nullable
    )
      throw persistedCorruption(`Invalid NULL operator for ${expression.attribute}`);
    const values: SegmentValue[] = [];
    collectPredicateValues(expression, values);
    assertPersistedValueCollection(expression, values, descriptor, state);
    state.complexity += descriptor.complexityCost;
    return;
  }

  const descriptor = state.registry.function(expression.name);
  if (!descriptor || descriptor.name !== expression.name || descriptor.availability !== "AVAILABLE")
    throw persistedCorruption(`Invalid function ${expression.name}`);
  if (!operatorAllowed(descriptor.operators, expression.operator)) {
    throw persistedCorruption(`Invalid operator for ${expression.name}`);
  }
  if (!("parameters" in expression)) {
    state.complexity += descriptor.complexityCost;
    return;
  }
  if (expression.parameters.length > SEGMENT_DSL_LIMITS.functionParameters) {
    throw persistedCorruption(`Function parameter limit is exceeded for ${expression.name}`);
  }
  const descriptors = new Map(
    descriptor.parameters.map((parameter, index) => [parameter.name, { parameter, index }]),
  );
  const seen = new Set<string>();
  let lastOrder = -1;
  let aggregate = false;
  for (const parameter of expression.parameters) {
    state.nodeCount += 1;
    if (state.nodeCount > SEGMENT_DSL_LIMITS.rawAstNodes) {
      throw persistedCorruption("Normalized AST node limit is exceeded");
    }
    const registered = descriptors.get(parameter.name);
    if (!registered || seen.has(parameter.name) || registered.index <= lastOrder) {
      throw persistedCorruption(
        `Invalid parameter ordering for ${expression.name}.${parameter.name}`,
      );
    }
    seen.add(parameter.name);
    lastOrder = registered.index;
    aggregate ||= registered.parameter.aggregate;
    if (!operatorAllowed(registered.parameter.operators, parameter.operator)) {
      throw persistedCorruption(`Invalid operator for ${expression.name}.${parameter.name}`);
    }
    if (
      (parameter.operator === "is_null" || parameter.operator === "is_not_null") &&
      (!registered.parameter.nullable || registered.parameter.aggregate)
    )
      throw persistedCorruption(`Invalid NULL operator for ${expression.name}.${parameter.name}`);
    const values: SegmentValue[] = [];
    collectParameterValues(parameter, values);
    assertPersistedValueCollection(parameter, values, registered.parameter, state);
  }
  state.complexity += aggregate ? 5 : descriptor.complexityCost;
}

function assertPersistedValueCollection(
  owner: SegmentPredicateExpression | SegmentFunctionParameter,
  values: readonly SegmentValue[],
  descriptor: SegmentValueDescriptor,
  state: PersistedValidationState,
): void {
  if (
    (owner.operator === "in" || owner.operator === "not_in") &&
    values.length > SEGMENT_DSL_LIMITS.inValues
  )
    throw persistedCorruption("IN value limit is exceeded");
  if (
    (owner.operator === "in" || owner.operator === "not_in") &&
    new Set(values.map((value) => JSON.stringify(value))).size !== values.length
  )
    throw persistedCorruption("IN values are not canonical");
  state.nodeCount += values.length;
  if (state.nodeCount > SEGMENT_DSL_LIMITS.rawAstNodes) {
    throw persistedCorruption("Normalized AST node limit is exceeded");
  }
  for (const value of values) assertPersistedValue(value, descriptor, state);
}

function assertPersistedValue(
  value: SegmentValue,
  descriptor: SegmentValueDescriptor,
  state: PersistedValidationState,
): void {
  switch (descriptor.type) {
    case "String":
      if (
        value.kind !== "string" ||
        [...value.value].length > SEGMENT_DSL_LIMITS.stringCodePoints ||
        (descriptor.normalizeString?.(value.value) ?? value.value) !== value.value
      )
        throw persistedCorruption("Invalid canonical String value");
      return;
    case "Enum":
      if (
        value.kind !== "enum" ||
        [...value.value].length > SEGMENT_DSL_LIMITS.stringCodePoints ||
        value.value !== value.value.toUpperCase() ||
        !descriptor.enumValues?.includes(value.value)
      )
        throw persistedCorruption("Invalid canonical Enum value");
      return;
    case "Boolean":
      if (value.kind !== "boolean") throw persistedCorruption("Invalid Boolean value");
      return;
    case "Integer": {
      if (value.kind !== "integer" || value.value.length > 20)
        throw persistedCorruption("Invalid Integer value");
      const integer = BigInt(value.value);
      if (integer < INT64_MIN || integer > INT64_MAX || (descriptor.nonNegative && integer < 0n)) {
        throw persistedCorruption("Integer value is outside its domain");
      }
      return;
    }
    case "Decimal":
      if (
        value.kind !== "decimal" ||
        !isCanonicalDecimal(value.value) ||
        (descriptor.nonNegative && value.value.startsWith("-"))
      )
        throw persistedCorruption("Invalid canonical Decimal value");
      return;
    case "Money": {
      if (
        value.kind !== "money" ||
        !isBoundedDecimal(value.decimal) ||
        value.minor.length > 20 ||
        value.currencyCode !== state.definition.evaluationContext.currencyCode
      )
        throw persistedCorruption("Invalid canonical Money value");
      const exponent = currencyMinorUnitDigits(value.currencyCode);
      const minor = BigInt(value.minor);
      if (
        minor < INT64_MIN ||
        minor > INT64_MAX ||
        (descriptor.nonNegative && minor < 0n) ||
        decimalToMinor(value.decimal, exponent) !== minor ||
        formatMinor(minor, exponent) !== value.decimal
      )
        throw persistedCorruption("Money value is inconsistent with minor units");
      return;
    }
    case "Date":
      if (value.kind !== "date" && value.kind !== "namedDate" && value.kind !== "relativeDate")
        throw persistedCorruption("Invalid Date value");
      if (
        value.kind === "relativeDate" &&
        (!Number.isSafeInteger(value.amount) || (value.amount > 0 && !descriptor.allowFutureDate))
      )
        throw persistedCorruption("Relative Date value is outside its domain");
      return;
    case "DateTime":
      if (
        value.kind !== "dateTime" ||
        !value.value.endsWith("Z") ||
        new Date(value.value).toISOString() !== value.value
      )
        throw persistedCorruption("Invalid canonical DateTime value");
      return;
    case "ID":
      if (value.kind !== "entityId" || value.entity !== descriptor.entityType) {
        throw persistedCorruption("Invalid entity ID value");
      }
      state.entityReferences.add(entityReferenceKey(value.entity, value.id));
      return;
  }
}

function isCanonicalDecimal(value: string): boolean {
  if (!isBoundedDecimal(value)) return false;
  const unsigned = value.replace(/^-/, "");
  const [, fraction = ""] = unsigned.split(".");
  if (fraction.endsWith("0")) return false;
  return value !== "-0";
}

function isBoundedDecimal(value: string): boolean {
  if (value.length > 58 || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) return false;
  const [integer, fraction = ""] = value.replace(/^-/, "").split(".");
  const significant = `${integer}${fraction}`.replace(/^0+/u, "").length || 1;
  return significant <= 38 && fraction.length <= 18;
}

function operatorAllowed(operators: readonly string[], operator: string): boolean {
  return operators.includes(operator);
}

function persistedCorruption(message: string): Error {
  return new Error(`Persisted segment definition is corrupt: ${message}`);
}

function deriveMetadata(root: SegmentExpression, registry: SegmentRegistry) {
  const dependencies = new Set<SegmentDependency>();
  const contextDependencies = new Set<SegmentContextDependency>();
  let temporal = false;
  const visit = (expression: SegmentExpression): void => {
    if (expression.kind === "logical") return expression.children.forEach(visit);
    if (expression.kind === "not") return visit(expression.child);
    const descriptor =
      expression.kind === "function"
        ? registry.function(expression.name)
        : registry.attribute(expression.attribute);
    if (!descriptor || descriptor.availability !== "AVAILABLE")
      throw new Error("Persisted segment references an invalid registry descriptor");
    descriptor.dependencies.forEach((dependency) => dependencies.add(dependency));
    const values: SegmentValue[] = [];
    if (expression.kind === "function" && "parameters" in expression) {
      expression.parameters.forEach((parameter) => collectParameterValues(parameter, values));
    } else if (expression.kind === "predicate") collectPredicateValues(expression, values);
    const relative = values.some(
      (value) => value.kind === "namedDate" || value.kind === "relativeDate",
    );
    if (values.some((value) => value.kind === "money")) {
      contextDependencies.add("currency");
    }
    if (
      values.some(isDateLike) ||
      descriptor.name === "birthday" ||
      descriptor.dependencies.some((d) => d === "taxIdentifier" || d === "taxExemption")
    ) {
      contextDependencies.add("timezone");
    }
    temporal ||=
      descriptor.temporalContract === "SOURCE" ||
      descriptor.temporalContract === "VALUE_AND_SOURCE" ||
      (descriptor.temporalContract === "VALUE" && relative);
  };
  visit(root);
  return {
    dependencies: [...dependencies].sort(asciiCompare),
    contextDependencies: [...contextDependencies].sort(asciiCompare),
    temporal,
  };
}

function parsedExpressionValues(
  expression: ParsedPredicateExpression | ParsedFunctionExpression,
): ParsedValue[] {
  if (expression.kind === "predicate") {
    return [expression.value, expression.upperValue, ...(expression.values ?? [])].filter(
      (value): value is ParsedValue => !!value,
    );
  }
  return (expression.parameters ?? []).flatMap((parameter) =>
    [parameter.value, parameter.upperValue, ...(parameter.values ?? [])].filter(
      (value): value is ParsedValue => !!value,
    ),
  );
}

function forEachValue(root: SegmentExpression, callback: (value: SegmentValue) => void): void {
  if (root.kind === "logical")
    return root.children.forEach((child) => forEachValue(child, callback));
  if (root.kind === "not") return forEachValue(root.child, callback);
  const values: SegmentValue[] = [];
  if (root.kind === "function" && "parameters" in root)
    root.parameters.forEach((parameter) => collectParameterValues(parameter, values));
  if (root.kind === "predicate") collectPredicateValues(root, values);
  values.forEach(callback);
}

function collectPredicateValues(
  predicate: SegmentPredicateExpression,
  values: SegmentValue[],
): void {
  if ("value" in predicate) values.push(predicate.value);
  if ("upperValue" in predicate) values.push(predicate.upperValue);
  if ("values" in predicate) values.push(...predicate.values);
}

function collectParameterValues(parameter: SegmentFunctionParameter, values: SegmentValue[]): void {
  if ("value" in parameter) values.push(parameter.value);
  if ("upperValue" in parameter) values.push(parameter.upperValue);
  if ("values" in parameter) values.push(...parameter.values);
}

function deduplicateValues(values: readonly SegmentValue[]): SegmentValue[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDateLike(
  value: SegmentValue,
): value is Extract<SegmentValue, { kind: "date" | "namedDate" | "relativeDate" }> {
  return value.kind === "date" || value.kind === "namedDate" || value.kind === "relativeDate";
}

function compareBigInt(left: bigint, right: bigint): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareScaledDecimal(left: string, right: string): number {
  const scale = Math.max(left.split(".")[1]?.length ?? 0, right.split(".")[1]?.length ?? 0);
  return compareBigInt(decimalToMinor(left, scale)!, decimalToMinor(right, scale)!);
}

function entityReferenceKey(entity: string, id: string): string {
  return `${entity}\0${id}`;
}

function isUuidV7(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function equalArrays<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
