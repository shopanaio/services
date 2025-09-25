import { Buffer } from 'node:buffer';

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/;
export const GLOBAL_ID_PATTERN = /^gid:\/\/([^/]+)\/([^/]+)\/([^/]+)$/;
const GLOBAL_ID_PREFIX = 'gid://';

/**
 * Represents a parsed Relay global identifier.
 */
export interface GlobalId {
  /** Namespace corresponds to the application namespace (e.g., "shopana"). */
  namespace: string;
  /** TypeName is the GraphQL type name (e.g., "Product"). */
  typeName: string;
  /** Id is the raw entity identifier (UUID or database primary key). */
  id: string;
}

/**
 * Creates a Relay-compliant global identifier encoded in base64.
 */
export function composeGlobalId(namespace: string, typeName: string, id: string): string {
  const raw = `${GLOBAL_ID_PREFIX}${namespace}/${typeName}/${id}`;
  return Buffer.from(raw, 'utf8').toString('base64');
}

/**
 * Alias for composeGlobalId to mirror naming found in other languages.
 */
export function encodeGlobalId(namespace: string, typeName: string, id: string): string {
  return composeGlobalId(namespace, typeName, id);
}

/**
 * Decodes and validates a Relay global identifier.
 */
export function parseGlobalId(globalId: string): GlobalId {
  const decoded = decodeBase64(globalId);
  const match = GLOBAL_ID_PATTERN.exec(decoded);

  if (!match) {
    throw new Error(`Invalid Global ID format: ${decoded}`);
  }

  return {
    namespace: match[1],
    typeName: match[2],
    id: match[3],
  };
}

/**
 * Alias for parseGlobalId to mirror naming found in other languages.
 */
export function decodeGlobalId(globalId: string): GlobalId {
  return parseGlobalId(globalId);
}

function decodeBase64(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error('Global ID cannot be empty.');
  }

  if (!BASE64_PATTERN.test(trimmed)) {
    throw new Error('Global ID is not a valid base64 string.');
  }

  try {
    return Buffer.from(trimmed, 'base64').toString('utf8');
  } catch (error) {
    throw new Error(`Failed to decode Global ID: ${(error as Error).message}`);
  }
}

/**
 * The namespace used for all Global IDs in the Shopana platform
 */
export const GLOBAL_ID_NAMESPACE = "shopana" as const;

/**
 * Enum defining all available Global ID entity types in the system
 */
export enum GlobalIdEntity {
  Checkout = "Checkout",
  CheckoutLine = "CheckoutLine",
  CheckoutDeliveryGroup = "CheckoutDeliveryGroup",
  CheckoutDeliveryAddress = "CheckoutDeliveryAddress",
  CheckoutNotification = "CheckoutNotification",
  Order = "Order",
  OrderLine = "OrderLine",
  OrderDeliveryAddress = "OrderDeliveryAddress",
  User = "User",
  ProductVariant = "ProductVariant",
}

/**
 * Type representing any valid Global ID entity type
 */
export type GlobalIdType = (typeof GlobalIdEntity)[keyof typeof GlobalIdEntity];

// Export codec functions
export { encodeGlobalIdByType, decodeGlobalIdByType } from './idCodec.js';

// Export validators
export { IsGlobalId, IsGlobalIdArray } from './validators.js';
