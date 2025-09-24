import { decodeGlobalId, encodeGlobalId, type GlobalId } from "@shopana/shared-graphql-guid";

const GLOBAL_ID_NAMESPACE = "shopana" as const;

export const GlobalIdTypes = {
  Checkout: "Checkout",
  CheckoutLine: "CheckoutLine",
  CheckoutDeliveryGroup: "CheckoutDeliveryGroup",
  CheckoutDeliveryAddress: "CheckoutDeliveryAddress",
  CheckoutNotification: "CheckoutNotification",
  User: "User",
  ProductVariant: "ProductVariant",
} as const;

export type GlobalIdType = (typeof GlobalIdTypes)[keyof typeof GlobalIdTypes];

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
  expectedTypes: readonly GlobalIdType[],
): DecodedGlobalId {
  if (expectedTypes.length > 0) {
    const matchesType = expectedTypes.some(
      (type) => decoded.typeName === type,
    );

    if (!matchesType) {
      throw new Error(
        `Unexpected Global ID type: ${decoded.typeName}. Expected one of: ${expectedTypes.join(", ")}`,
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

export function encodeCheckoutId(id: string): string {
  return encode(GlobalIdTypes.Checkout, id);
}

export function decodeCheckoutId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.Checkout);
}

export function encodeCheckoutLineId(id: string): string {
  return encode(GlobalIdTypes.CheckoutLine, id);
}

export function decodeCheckoutLineId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.CheckoutLine);
}

export function encodeCheckoutDeliveryGroupId(id: string): string {
  return encode(GlobalIdTypes.CheckoutDeliveryGroup, id);
}

export function decodeCheckoutDeliveryGroupId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.CheckoutDeliveryGroup);
}

export function encodeCheckoutDeliveryAddressId(id: string): string {
  return encode(GlobalIdTypes.CheckoutDeliveryAddress, id);
}

export function decodeCheckoutDeliveryAddressId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.CheckoutDeliveryAddress);
}

export function encodeCheckoutNotificationId(id: string): string {
  return encode(GlobalIdTypes.CheckoutNotification, id);
}

export function decodeCheckoutNotificationId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.CheckoutNotification);
}

export function encodeUserId(id: string): string {
  return encode(GlobalIdTypes.User, id);
}

export function decodeUserId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.User);
}

export function encodeProductVariantId(id: string): string {
  return encode(GlobalIdTypes.ProductVariant, id);
}

export function decodeProductVariantId(globalId: string): string {
  return decodeId(globalId, GlobalIdTypes.ProductVariant);
}
