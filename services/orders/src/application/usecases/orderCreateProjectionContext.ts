import {
  createAsyncContextToken,
  getAsyncContextValue,
  runAsyncContext,
  setAsyncContextValue,
} from "@shopana/shared-async-context";

export interface OrderCreateProjectionContact {
  projectId: string;
  orderId: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerPhoneE164: string | null;
  customerNote: string | null;
  countryCode: string | null;
  metadata: Record<string, unknown> | null;
  expiresAt: Date | null;
}

export interface OrderCreateProjectionDeliveryAddress {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  metadata: Record<string, unknown> | null;
}

export interface OrderCreateProjectionRecipient {
  id: string;
  projectId: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
}

export interface OrderCreateProjectionDeliveryMethod {
  code: string;
  provider: string;
  deliveryGroupId: string;
  deliveryMethodType: string;
  paymentModel: string | null;
  metadata: Record<string, unknown> | null;
  customerInput: Record<string, unknown> | null;
}

export interface OrderCreateProjectionPaymentMethod {
  code: string;
  provider: string;
  flow: string;
  metadata: Record<string, unknown> | null;
  customerInput: Record<string, unknown> | null;
}

export interface OrderCreateProjectionContextData {
  contact: OrderCreateProjectionContact | null;
  deliveryAddresses: OrderCreateProjectionDeliveryAddress[];
  recipients: OrderCreateProjectionRecipient[];
  deliveryGroupMappings: Array<{
    deliveryGroupId: string;
    addressId: string;
    recipientId: string;
  }>;
  deliveryMethods: OrderCreateProjectionDeliveryMethod[];
  selectedDeliveryMethods: Array<{
    deliveryGroupId: string;
    code: string;
    provider: string;
  }>;
  paymentMethods: OrderCreateProjectionPaymentMethod[];
  selectedPaymentMethod: {
    code: string;
    provider: string;
  } | null;
}

const orderCreateProjectionToken = createAsyncContextToken<
  Map<string, OrderCreateProjectionContextData>
>("order-create-projection-data");

/**
 * Runs provided function within order create projection context lifecycle.
 */
export async function runOrderCreateProjectionContext<T>(
  fn: () => Promise<T> | T
): Promise<T> {
  return runAsyncContext(async () => await fn(), [
    [orderCreateProjectionToken, new Map<string, OrderCreateProjectionContextData>()],
  ]);
}

function ensureStore(): Map<string, OrderCreateProjectionContextData> {
  const store = getAsyncContextValue(orderCreateProjectionToken);
  if (!store) {
    const freshStore = new Map<string, OrderCreateProjectionContextData>();
    setAsyncContextValue(orderCreateProjectionToken, freshStore);
    return freshStore;
  }
  return store;
}

/**
 * Stores order-scoped projection context for later inline projection usage.
 */
export function setOrderCreateProjectionContext(
  orderId: string,
  data: OrderCreateProjectionContextData
): void {
  const store = ensureStore();
  store.set(orderId, data);
}

/**
 * Reads order-scoped projection context if present.
 */
export function getOrderCreateProjectionContext(
  orderId: string
): OrderCreateProjectionContextData | undefined {
  const store = getAsyncContextValue(orderCreateProjectionToken);
  if (!store) {
    return undefined;
  }
  return store.get(orderId);
}

/**
 * Reads and removes order-scoped projection context.
 */
export function consumeOrderCreateProjectionContext(
  orderId: string
): OrderCreateProjectionContextData | undefined {
  const store = getAsyncContextValue(orderCreateProjectionToken);
  if (!store) {
    return undefined;
  }
  const data = store.get(orderId);
  if (data) {
    store.delete(orderId);
  }
  return data;
}
