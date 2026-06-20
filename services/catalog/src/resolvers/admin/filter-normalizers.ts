import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";

type IdFilter = {
  _eq?: string | null;
  _neq?: string | null;
  _in?: string[] | null;
  _notIn?: string[] | null;
  _is?: boolean | null;
  _isNot?: boolean | null;
};

type WhereNode = Record<string, unknown>;

function decodeGlobalIdOrReturnValue(
  id: string,
  entity: GlobalIdType
): string {
  try {
    return decodeGlobalIdByType(id, entity);
  } catch {
    return id;
  }
}

function normalizeIdFilter(filter: unknown, entity: GlobalIdType): unknown {
  if (!filter || typeof filter !== "object") {
    return filter;
  }

  const idFilter = filter as IdFilter;

  return {
    ...idFilter,
    _eq:
      idFilter._eq == null
        ? idFilter._eq
        : decodeGlobalIdOrReturnValue(idFilter._eq, entity),
    _neq:
      idFilter._neq == null
        ? idFilter._neq
        : decodeGlobalIdOrReturnValue(idFilter._neq, entity),
    _in:
      idFilter._in == null
        ? idFilter._in
        : idFilter._in.map((id) => decodeGlobalIdOrReturnValue(id, entity)),
    _notIn:
      idFilter._notIn == null
        ? idFilter._notIn
        : idFilter._notIn.map((id) =>
            decodeGlobalIdOrReturnValue(id, entity)
          ),
  };
}

function normalizeWhereList<TWhere>(
  values: unknown,
  normalize: (where: TWhere | null | undefined) => TWhere | undefined
): TWhere[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  return values
    .map((value) => normalize(value as TWhere))
    .filter((value): value is TWhere => value != null);
}

function normalizeVariantWhereNode(
  where: VariantRelayInput["where"] | null | undefined
): VariantRelayInput["where"] {
  if (!where) {
    return undefined;
  }

  const normalized = { ...(where as WhereNode) };

  normalized._and = normalizeWhereList<VariantRelayInput["where"]>(
    normalized._and,
    normalizeVariantWhereNode
  );
  normalized._or = normalizeWhereList<VariantRelayInput["where"]>(
    normalized._or,
    normalizeVariantWhereNode
  );
  normalized._not = normalizeVariantWhereNode(
    normalized._not as VariantRelayInput["where"] | null | undefined
  );
  normalized.id = normalizeIdFilter(normalized.id, GlobalIdEntity.Variant);
  normalized.productId = normalizeIdFilter(
    normalized.productId,
    GlobalIdEntity.Product
  );

  return normalized as VariantRelayInput["where"];
}

export function normalizeVariantWhereInput(
  where: VariantRelayInput["where"] | null | undefined
): VariantRelayInput["where"] {
  return normalizeVariantWhereNode(where);
}
