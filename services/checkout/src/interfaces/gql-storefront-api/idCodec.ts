import {
  decodeGlobalId,
  encodeGlobalId,
  type GlobalId,
  GLOBAL_ID_NAMESPACE,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

export { GlobalIdEntity, type GlobalIdType };

interface DecodedGlobalId extends GlobalId {
  typeName: GlobalIdType | string;
}

function decode(globalId: string): DecodedGlobalId {
  const parsed = decodeGlobalId(globalId);

  if (parsed.namespace !== GLOBAL_ID_NAMESPACE) {
    throw new Error(`Unexpected Global ID namespace: ${parsed.namespace}`);
  }

  return parsed as DecodedGlobalId;
}

function ensureType(
  decoded: DecodedGlobalId,
  expectedTypes: readonly GlobalIdType[]
): DecodedGlobalId {
  if (expectedTypes.length > 0) {
    const matchesType = expectedTypes.some((type) => decoded.typeName === type);

    if (!matchesType) {
      throw new Error(
        `Unexpected Global ID type: ${
          decoded.typeName
        }. Expected one of: ${expectedTypes.join(", ")}`
      );
    }
  }

  return decoded;
}

function encode(type: GlobalIdType, id: string): string {
  return encodeGlobalId(GLOBAL_ID_NAMESPACE, type, id);
}

function decodeId(globalId: string, ...types: GlobalIdType[]): string {
  const decoded = ensureType(decode(globalId), types);
  return decoded.id;
}

/**
 * Universal function to encode any Global ID type
 *
 * @param id - The UUID to encode
 * @param type - The Global ID type from GlobalIdEntity
 *
 * @example
 * ```typescript
 * const checkoutGlobalId = encodeGlobalIdByType(checkoutUuid, GlobalIdEntity.Checkout);
 * const userGlobalId = encodeGlobalIdByType(userUuid, GlobalIdEntity.User);
 * ```
 */
export function encodeGlobalIdByType(id: string, type: GlobalIdType): string {
  return encode(type, id);
}

/**
 * Universal function to decode any Global ID type
 *
 * @param globalId - The base64 Global ID to decode
 * @param expectedType - Optional expected type. If provided, validates the type matches.
 *
 * @example
 * ```typescript
 * const checkoutUuid = decodeGlobalIdByType(globalId, GlobalIdEntity.Checkout);
 * const anyUuid = decodeGlobalIdByType(globalId); // Any valid type
 * ```
 */
export function decodeGlobalIdByType(
  globalId: string,
  expectedType?: GlobalIdType
): string {
  if (expectedType) {
    return decodeId(globalId, expectedType);
  } else {
    // Decode without type validation - any valid Global ID type
    const decoded = decode(globalId);
    return decoded.id;
  }
}
