export const SEGMENT_DSL_LIMITS = Object.freeze({
  queryUtf8Bytes: 8_192,
  rawTokens: 2_048,
  rawAstNodes: 512,
  rawNestingDepth: 32,
  leafClauses: 20,
  logicalNestingDepth: 6,
  inValues: 100,
  functionParameters: 8,
  stringCodePoints: 1_024,
  referencedEntityIds: 200,
  diagnostics: 50,
  complexity: 40,
});

export const SEGMENT_DSL_VERSION = 1 as const;

export const SEGMENT_DIAGNOSTIC_CODES = Object.freeze({
  syntax: "SEGMENT_QUERY_SYNTAX_ERROR",
  unknownAttribute: "SEGMENT_UNKNOWN_ATTRIBUTE",
  unavailable: "SEGMENT_ATTRIBUTE_UNAVAILABLE",
  operator: "SEGMENT_OPERATOR_NOT_SUPPORTED",
  type: "SEGMENT_VALUE_TYPE_MISMATCH",
  enum: "SEGMENT_INVALID_ENUM_VALUE",
  entityId: "SEGMENT_INVALID_ENTITY_ID",
  date: "SEGMENT_INVALID_DATE",
  dateRange: "SEGMENT_INVALID_DATE_RANGE",
  money: "SEGMENT_INVALID_MONEY",
  duplicateParameter: "SEGMENT_DUPLICATE_PARAMETER",
  complexity: "SEGMENT_COMPLEXITY_LIMIT",
  truncated: "SEGMENT_DIAGNOSTICS_TRUNCATED",
} as const);
