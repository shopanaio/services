import { ShippingMethod } from "@shopana/plugin-sdk/shipping";
import type { PaymentMethod } from "@shopana/plugin-sdk/payment";

/**
 * Raw response shape returned by the shipping service for list methods endpoints.
 */
export type GetAllMethodsResponse = Readonly<{
  /** Methods resolved for a project or checkout. */
  methods: ShippingMethod[];
  /** Optional warnings emitted by the service. */
  warnings?: Array<{ code: string; message: string }>;
}>;

/**
 * High-level client interface for the shipping service.
 */
export interface ShippingApiClient {
  /**
   * Fetch all available shipping methods for a project (tenant).
   * @param input.projectId - Tenant identifier for multi-tenant isolation.
   * @returns Array of shipping methods.
   */
  getProjectMethods(input: {
    projectId: string;
    requestId?: string;
    userAgent?: string;
  }): Promise<ShippingMethod[]>;

  /**
   * Build delivery groups for checkout based on item physicality flags.
   * @param input - Create delivery groups command input.
   * @returns List of delivery groups with method type candidates and item refs.
   */
  createDeliveryGroups(
    input: CreateDeliveryGroupsInput
  ): Promise<DeliveryGroup[]>;

  /**
   * Fetch payment methods exposed by shipping plugins (if supported).
   */
  getPaymentMethods(input: GetPaymentMethodsInput): Promise<PaymentMethod[]>;
}

/**
 * Item descriptor for grouping request.
 *
 * @property ref - Opaque reference to a line item (index or id), echoed back in response.
 * @property isPhysical - Indicates whether the item requires shipping.
 * @property quantity - Optional quantity, reserved for future grouping strategies.
 */
export type GroupingItem = Readonly<{
  ref: string;
  quantity?: number;
}>;

/**
 * Input for creating delivery groups.
 *
 * @property projectId - Tenant identifier for multi-tenant isolation.
 * @property items - Items to group by delivery method types.
 */
export type CreateDeliveryGroupsInput = Readonly<{
  projectId: string;
  items?: GroupingItem[];
}>;

/**
 * Delivery group returned by the shipping service.
 *
 * @property refs - References to items that belong to this group.
 * @property deliveryMethodTypes - Candidate delivery method types for this group.
 */
export type DeliveryGroup = Readonly<{
  refs: string[];
  methods: ShippingMethod[];
}>;

/**
 * Raw response for create delivery groups endpoint.
 */
export type CreateDeliveryGroupsResponse = Readonly<{
  /** Delivery groups produced by the service. */
  groups: DeliveryGroup[];
  /** Optional warnings describing non-critical issues. */
  warnings?: Array<{ code: string; message: string }>;
}>;

/**
 * Raw response shape returned by the shipping service for payment methods endpoint.
 */
export type GetPaymentMethodsResponse = Readonly<{
  methods: PaymentMethod[];
  warnings?: Array<{ code: string; message: string }>;
}>;

/**
 * Input for getting payment methods from shipping service (proxied to plugins).
 */
export type GetPaymentMethodsInput = Readonly<{
  projectId: string;
  currency: string;
  apiKey: string;
}>;
