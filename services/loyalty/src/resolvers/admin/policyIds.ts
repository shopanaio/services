import { decodeGlobalIdByType, encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

const SELECTOR_ENTITY = {
  PRODUCT: GlobalIdEntity.Product,
  VARIANT: GlobalIdEntity.Variant,
  CATEGORY: GlobalIdEntity.Category,
  TAG: GlobalIdEntity.Tag,
  FEATURE: GlobalIdEntity.Feature,
  OPTION_VALUE: GlobalIdEntity.OptionValue,
} as const;

export function encodeSelectorIds(selector: { type: string; ids: readonly string[] }) {
  const entity = SELECTOR_ENTITY[selector.type as keyof typeof SELECTOR_ENTITY];
  return {
    ...selector,
    ids: entity ? selector.ids.map((id) => encodeGlobalIdByType(id, entity)) : selector.ids,
  };
}

export function normalizeProgramRulesInput(value: Record<string, unknown>): Record<string, unknown> {
  const eligibility = value.eligibility as Record<string, unknown>;
  const earning = value.earning as Record<string, unknown>;
  return {
    ...value,
    schemaVersion: value.schemaVersion ?? 1,
    eligibility: {
      ...eligibility,
      segmentIds: decodeSegments(eligibility.segmentIds),
      excludedSegmentIds: decodeSegments(eligibility.excludedSegmentIds),
    },
    earning: {
      ...earning,
      modifierStackingMode: earning.modifierStackingMode ?? "HIGHEST",
      excludedSelectors: decodeSelectors(earning.excludedSelectors),
      modifiers: Array.isArray(earning.modifiers)
        ? earning.modifiers.map((item) => {
            const modifier = item as Record<string, unknown>;
            return {
              ...modifier,
              selector: decodeSelectorIds(modifier.selector as { type: string; ids: readonly string[] }),
              segmentIds: decodeSegments(modifier.segmentIds),
            };
          })
        : [],
    },
  };
}

function decodeSelectorIds(selector: { type: string; ids: readonly string[] }) {
  const entity = SELECTOR_ENTITY[selector.type as keyof typeof SELECTOR_ENTITY];
  return {
    ...selector,
    ids: entity ? selector.ids.map((id) => decodeGlobalIdByType(id, entity)) : selector.ids,
  };
}

export function presentProgramRules(value: Record<string, unknown>): Record<string, unknown> {
  const eligibility = value.eligibility as Record<string, unknown> | undefined;
  const earning = value.earning as Record<string, unknown> | undefined;
  return {
    ...value,
    eligibility: eligibility ? {
      ...eligibility,
      segmentIds: encodeSegments(eligibility.segmentIds),
      excludedSegmentIds: encodeSegments(eligibility.excludedSegmentIds),
    } : eligibility,
    earning: earning ? {
      ...earning,
      excludedSelectors: encodeSelectors(earning.excludedSelectors),
      modifiers: Array.isArray(earning.modifiers)
        ? earning.modifiers.map((item) => {
            const modifier = item as Record<string, unknown>;
            return {
              ...modifier,
              selector: modifier.selector
                ? encodeSelectorIds(modifier.selector as { type: string; ids: readonly string[] })
                : modifier.selector,
              segmentIds: encodeSegments(modifier.segmentIds),
            };
          })
        : earning.modifiers,
    } : earning,
  };
}

function encodeSegments(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((id) => encodeGlobalIdByType(String(id), GlobalIdEntity.CustomerSegment))
    : value;
}

function encodeSelectors(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((selector) => encodeSelectorIds(selector as { type: string; ids: readonly string[] }))
    : value;
}

function decodeSegments(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((id) => decodeGlobalIdByType(String(id), GlobalIdEntity.CustomerSegment))
    : [];
}

function decodeSelectors(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((selector) => decodeSelectorIds(selector as { type: string; ids: readonly string[] }))
    : [];
}
