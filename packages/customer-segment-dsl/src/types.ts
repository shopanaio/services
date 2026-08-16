export interface SegmentSourceRange {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly line: number;
  readonly column: number;
}

export interface SegmentDiagnostic extends SegmentSourceRange {
  readonly code: string;
  readonly message: string;
  readonly severity: "ERROR" | "WARNING";
  readonly details?: Readonly<Record<string, unknown>>;
}

export type ParsedScalarOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export type ParsedPredicateOperator =
  | ParsedScalarOperator
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "contains"
  | "not_contains";

export type ParsedValue =
  | { readonly kind: "string"; readonly value: string; readonly range: SegmentSourceRange }
  | { readonly kind: "number"; readonly value: string; readonly range: SegmentSourceRange }
  | { readonly kind: "boolean"; readonly value: boolean; readonly range: SegmentSourceRange }
  | { readonly kind: "date"; readonly value: string; readonly range: SegmentSourceRange }
  | { readonly kind: "dateTime"; readonly value: string; readonly range: SegmentSourceRange }
  | { readonly kind: "namedDate"; readonly value: "today" | "yesterday"; readonly range: SegmentSourceRange }
  | {
      readonly kind: "relativeDate";
      readonly value: string;
      readonly range: SegmentSourceRange;
    };

export type ParsedExpression =
  | {
      readonly kind: "logical";
      readonly operator: "and" | "or";
      readonly children: readonly [ParsedExpression, ParsedExpression, ...ParsedExpression[]];
      readonly range: SegmentSourceRange;
    }
  | { readonly kind: "not"; readonly child: ParsedExpression; readonly range: SegmentSourceRange }
  | ParsedPredicateExpression
  | ParsedFunctionExpression;

export interface ParsedPredicateExpression {
  readonly kind: "predicate";
  readonly attribute: string;
  readonly operator: ParsedPredicateOperator;
  readonly value?: ParsedValue;
  readonly upperValue?: ParsedValue;
  readonly values?: readonly ParsedValue[];
  readonly range: SegmentSourceRange;
  readonly attributeRange: SegmentSourceRange;
}

export interface ParsedFunctionParameter {
  readonly name: string;
  readonly operator: Exclude<ParsedPredicateOperator, "contains" | "not_contains">;
  readonly value?: ParsedValue;
  readonly upperValue?: ParsedValue;
  readonly values?: readonly ParsedValue[];
  readonly range: SegmentSourceRange;
  readonly nameRange: SegmentSourceRange;
}

export interface ParsedFunctionExpression {
  readonly kind: "function";
  readonly name: string;
  readonly operator: "matches" | "not_matches" | "is_null" | "is_not_null";
  readonly parameters?: readonly ParsedFunctionParameter[];
  readonly range: SegmentSourceRange;
  readonly nameRange: SegmentSourceRange;
}

export interface ParsedSegmentQuery {
  readonly root: ParsedExpression;
  readonly source: string;
}

export type SegmentContextDependency = "currency" | "timezone";

export type SegmentDependency =
  | "customer.any"
  | "profile"
  | "contact"
  | "company"
  | "status"
  | "address"
  | "consent"
  | "tag"
  | "group"
  | "taxIdentifier"
  | "taxExemption"
  | "statistics.order"
  | "statistics.checkout"
  | "statistics.refund";

export type SegmentPredicateOperator = ParsedPredicateOperator;

export interface SegmentEvaluationContextV1 {
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly storeConfigurationRevision: number;
}

export interface SegmentStoreEvaluationContext {
  readonly storeId: string;
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly configurationRevision: number;
}

export type SegmentValue =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "enum"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "integer"; readonly value: string }
  | { readonly kind: "decimal"; readonly value: string }
  | {
      readonly kind: "money";
      readonly decimal: string;
      readonly minor: string;
      readonly currencyCode: string;
      readonly currencyExponent: number;
    }
  | { readonly kind: "date"; readonly value: string }
  | { readonly kind: "dateTime"; readonly value: string }
  | { readonly kind: "namedDate"; readonly value: "today" | "yesterday" }
  | {
      readonly kind: "relativeDate";
      readonly amount: number;
      readonly unit: "day" | "week" | "month" | "year";
    }
  | { readonly kind: "entityId"; readonly entity: string; readonly id: string };

export type SegmentExpression =
  | SegmentLogicalExpression
  | SegmentNotExpression
  | SegmentPredicateExpression
  | SegmentFunctionExpression;

export interface SegmentLogicalExpression {
  readonly kind: "logical";
  readonly operator: "and" | "or";
  readonly children: readonly [SegmentExpression, SegmentExpression, ...SegmentExpression[]];
}

export interface SegmentNotExpression {
  readonly kind: "not";
  readonly child: SegmentExpression;
}

export type SegmentPredicateExpression =
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: ParsedScalarOperator;
      readonly value: SegmentValue;
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "between";
      readonly value: SegmentValue;
      readonly upperValue: SegmentValue;
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "in" | "not_in";
      readonly values: readonly [SegmentValue, ...SegmentValue[]];
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "is_null" | "is_not_null";
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "contains" | "not_contains";
      readonly value: SegmentValue;
    };

export type SegmentFunctionParameter =
  | {
      readonly name: string;
      readonly operator: ParsedScalarOperator;
      readonly value: SegmentValue;
    }
  | {
      readonly name: string;
      readonly operator: "between";
      readonly value: SegmentValue;
      readonly upperValue: SegmentValue;
    }
  | {
      readonly name: string;
      readonly operator: "in" | "not_in";
      readonly values: readonly [SegmentValue, ...SegmentValue[]];
    }
  | { readonly name: string; readonly operator: "is_null" | "is_not_null" };

export type SegmentFunctionExpression =
  | {
      readonly kind: "function";
      readonly name: string;
      readonly operator: "matches" | "not_matches";
      readonly parameters: readonly SegmentFunctionParameter[];
    }
  | {
      readonly kind: "function";
      readonly name: string;
      readonly operator: "is_null" | "is_not_null";
    };

export interface SegmentDefinitionV1 {
  readonly version: 1;
  readonly root: SegmentExpression;
  readonly dependencies: readonly SegmentDependency[];
  readonly contextDependencies: readonly SegmentContextDependency[];
  readonly evaluationContext: SegmentEvaluationContextV1;
  readonly temporal: boolean;
}

export type SegmentValueType =
  | "String"
  | "Enum"
  | "Boolean"
  | "Integer"
  | "Decimal"
  | "Money"
  | "Date"
  | "DateTime"
  | "ID";

export type SegmentTemporalContract = "NONE" | "VALUE" | "SOURCE" | "VALUE_AND_SOURCE";
export type SegmentAttributeAvailability = "AVAILABLE" | "UNAVAILABLE";

export interface SegmentValueDescriptor {
  readonly type: SegmentValueType;
  readonly operators: readonly SegmentPredicateOperator[];
  readonly nullable: boolean;
  readonly enumValues?: readonly string[];
  readonly entityType?: string;
  readonly allowFutureDate?: boolean;
  readonly nonNegative?: boolean;
  readonly normalizeString?: (value: string) => string;
}

export interface SegmentAttributeDescriptor extends SegmentValueDescriptor {
  readonly name: string;
  readonly presentationKey: string;
  readonly kind: "SCALAR" | "LIST" | "VIRTUAL";
  readonly availability: SegmentAttributeAvailability;
  readonly unavailabilityReason?: string;
  readonly dependencies: readonly SegmentDependency[];
  readonly normalizationContract: string;
  readonly indexContract: readonly string[];
  readonly temporalContract: SegmentTemporalContract;
  readonly complexityCost: 1 | 2 | 3 | 5;
  readonly sourceKind?: "scalar" | "statistics" | "list" | "virtual";
}

export interface SegmentFunctionParameterDescriptor extends SegmentValueDescriptor {
  readonly name: string;
  readonly presentationKey: string;
  readonly aggregate: boolean;
}

export interface SegmentFunctionDescriptor {
  readonly name: string;
  readonly presentationKey: string;
  readonly kind: "FUNCTION";
  readonly availability: SegmentAttributeAvailability;
  readonly unavailabilityReason?: string;
  readonly operators: readonly ("matches" | "not_matches" | "is_null" | "is_not_null")[];
  readonly parameters: readonly SegmentFunctionParameterDescriptor[];
  readonly dependencies: readonly SegmentDependency[];
  readonly normalizationContract: string;
  readonly indexContract: readonly string[];
  readonly temporalContract: SegmentTemporalContract;
  readonly complexityCost: 3 | 5;
}

export type SegmentRegistryDescriptor = SegmentAttributeDescriptor | SegmentFunctionDescriptor;

export interface SegmentAttributeCatalogDescriptor {
  readonly name: string;
  readonly presentationKey: string;
  readonly kind: "SCALAR" | "LIST" | "FUNCTION" | "VIRTUAL";
  readonly valueType: string;
  readonly operators: readonly string[];
  readonly enumValues: readonly string[];
  readonly parameters: readonly {
    readonly name: string;
    readonly presentationKey: string;
    readonly valueType: string;
    readonly operators: readonly string[];
    readonly enumValues: readonly string[];
    readonly aggregate: boolean;
    readonly nullable: boolean;
  }[];
  readonly availability: SegmentAttributeAvailability;
  readonly unavailabilityReason: string | null;
}

export interface SegmentEntityReference {
  readonly entity: string;
  readonly id: string;
  readonly range: SegmentSourceRange;
}

export interface SegmentSemanticOptions {
  readonly storeContext: SegmentStoreEvaluationContext;
  readonly entityExists?: (
    storeId: string,
    references: readonly SegmentEntityReference[],
  ) => Promise<ReadonlySet<string>>;
}

export interface SegmentValidationResult {
  readonly valid: boolean;
  readonly canonicalQuery: string | null;
  readonly definition: SegmentDefinitionV1 | null;
  readonly complexity: number | null;
  readonly diagnostics: readonly SegmentDiagnostic[];
}

export interface SegmentTemporalEvaluation {
  readonly value: boolean;
  readonly nextChangeAt: string | null;
}
