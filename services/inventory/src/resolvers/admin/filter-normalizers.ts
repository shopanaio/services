import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
import type { WarehouseRelayInput } from "../../repositories/warehouse/WarehouseRepository.js";

type IdFilter = {
  _eq?: string | null;
  _neq?: string | null;
  _in?: string[] | null;
  _notIn?: string[] | null;
  _is?: boolean | null;
  _isNot?: boolean | null;
};

type WhereNode = Record<string, unknown>;

function normalizeIdFilter(
  filter: unknown,
  entity: GlobalIdType,
): unknown {
  if (!filter || typeof filter !== "object") {
    return filter;
  }

  const idFilter = filter as IdFilter;

  return {
    ...idFilter,
    _eq:
      idFilter._eq == null
        ? idFilter._eq
        : decodeGlobalIdByType(idFilter._eq, entity),
    _neq:
      idFilter._neq == null
        ? idFilter._neq
        : decodeGlobalIdByType(idFilter._neq, entity),
    _in:
      idFilter._in == null
        ? idFilter._in
        : idFilter._in.map((id) => decodeGlobalIdByType(id, entity)),
    _notIn:
      idFilter._notIn == null
        ? idFilter._notIn
        : idFilter._notIn.map((id) => decodeGlobalIdByType(id, entity)),
  };
}

function normalizeWhereList<TWhere>(
  values: unknown,
  normalize: (where: TWhere | null | undefined) => TWhere | undefined,
): TWhere[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  return values
    .map((value) => normalize(value as TWhere))
    .filter((value): value is TWhere => value != null);
}

function normalizeWarehouseWhereNode(
  where: WarehouseRelayInput["where"] | null | undefined,
): WarehouseRelayInput["where"] {
  if (!where) {
    return undefined;
  }

  const normalized = { ...(where as WhereNode) };

  normalized._and = normalizeWhereList<WarehouseRelayInput["where"]>(
    normalized._and,
    normalizeWarehouseWhereNode,
  );
  normalized._or = normalizeWhereList<WarehouseRelayInput["where"]>(
    normalized._or,
    normalizeWarehouseWhereNode,
  );
  normalized._not = normalizeWarehouseWhereNode(
    normalized._not as WarehouseRelayInput["where"] | null | undefined,
  );
  normalized.id = normalizeIdFilter(normalized.id, GlobalIdEntity.Warehouse);

  return normalized as WarehouseRelayInput["where"];
}

function normalizeWarehouseStockWhereNode(
  where: StockRelayInput["where"] | null | undefined,
): StockRelayInput["where"] {
  if (!where) {
    return undefined;
  }

  const normalized = { ...(where as WhereNode) };

  normalized._and = normalizeWhereList<StockRelayInput["where"]>(
    normalized._and,
    normalizeWarehouseStockWhereNode,
  );
  normalized._or = normalizeWhereList<StockRelayInput["where"]>(
    normalized._or,
    normalizeWarehouseStockWhereNode,
  );
  normalized._not = normalizeWarehouseStockWhereNode(
    normalized._not as StockRelayInput["where"] | null | undefined,
  );
  normalized.id = where.id;
  normalized.warehouseId = normalizeIdFilter(
    normalized.warehouseId,
    GlobalIdEntity.Warehouse,
  );
  normalized.variantId = normalizeIdFilter(
    normalized.variantId,
    GlobalIdEntity.Variant,
  );

  return normalized as StockRelayInput["where"];
}

export function normalizeWarehouseWhereInput(
  where: WarehouseRelayInput["where"] | null | undefined,
): WarehouseRelayInput["where"] {
  return normalizeWarehouseWhereNode(where);
}

export function normalizeWarehouseStockWhereInput(
  where: StockRelayInput["where"] | null | undefined,
): StockRelayInput["where"] {
  return normalizeWarehouseStockWhereNode(where);
}
