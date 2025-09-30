import type { TransactionScript } from "@shopana/shared-kernel";
import { ShippingMethod } from "@shopana/plugin-sdk/shipping";
import { shippingMethods } from "./shippingMethods";

export interface CreateDeliveryGroupsParams {
  projectId: string;
  items: Array<{ ref: string; isPhysical: boolean; quantity?: number }>;
}

export interface DeliveryGroupDto {
  refs: string[];
  methods: Array<ShippingMethod>;
}

export interface CreateDeliveryGroupsResult {
  groups: DeliveryGroupDto[];
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: build delivery groups for a checkout by simple physicality rule.
 */
export const createDeliveryGroups: TransactionScript<
  CreateDeliveryGroupsParams,
  CreateDeliveryGroupsResult
> = async (params, services) => {
  // Reuse the already prepared script for getting delivery methods
  const result = await shippingMethods(
    { projectId: params.projectId },
    services
  );

  // Always return one hardcoded group with the obtained methods
  // Methods are already transformed in getAllShippingMethods
  return {
    groups: [
      {
        refs: [],
        methods: result.methods,
      },
    ],
    warnings: result.warnings,
  };
};
