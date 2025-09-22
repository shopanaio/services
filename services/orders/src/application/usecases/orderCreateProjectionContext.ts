import {
  createAsyncContextToken,
  getAsyncContextValue,
  runAsyncContext,
  setAsyncContextValue,
} from "@shopana/shared-async-context";

export interface OrderCreateProjectionContact {
  projectId: string;
  orderId: string;
  customerEmail: string | null;
  customerPhoneE164: string | null;
  customerNote: string | null;
  expiresAt: Date | null;
}

export interface OrderCreateProjectionDeliveryAddress {
  id: string;
  projectId: string;
  orderId: string;
  deliveryGroupId: string | null;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
}

export interface OrderCreateProjectionContextData {
  contact: OrderCreateProjectionContact | null;
  deliveryAddresses: OrderCreateProjectionDeliveryAddress[];
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
