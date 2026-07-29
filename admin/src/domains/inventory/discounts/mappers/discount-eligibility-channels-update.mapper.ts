import type {
  ApiDiscount,
  ApiDiscountUpdateInput,
} from "@/graphql/types";
import { DiscountBuyerContextType } from "@/graphql/types";

export interface DiscountCustomerEditorRow {
  id: string;
  title: string;
  email: string;
}

export interface DiscountSegmentEditorRow {
  id: string;
  title: string;
  customersCount: number | null;
}

export interface DiscountChannelEditorRow {
  code: string;
  title: string;
  enabled: boolean;
  featured: boolean;
}

export interface DiscountEligibilityChannelsFormValues {
  buyerContextType: DiscountBuyerContextType;
  customers: DiscountCustomerEditorRow[];
  segments: DiscountSegmentEditorRow[];
  channels: DiscountChannelEditorRow[];
}

const CHANNELS = [
  { code: "ONLINE_STORE", title: "Online store" },
  { code: "MOBILE_APP", title: "Mobile app" },
  { code: "POINT_OF_SALE", title: "Point of sale" },
] as const;

export function createDiscountEligibilityChannelsFormValues(
  discount: ApiDiscount,
): DiscountEligibilityChannelsFormValues {
  const context = discount.buyerContext;

  return {
    buyerContextType: context?.type ?? DiscountBuyerContextType.All,
    customers:
      context?.customers.map((item) => ({
        id: item.customerId,
        title: item.customer?.displayName ?? item.customerId,
        email: item.customer?.email ?? "",
      })) ?? [],
    segments:
      context?.segments.map((item) => ({
        id: item.segmentId,
        title: item.segmentId,
        customersCount: null,
      })) ?? [],
    channels: CHANNELS.map((channel) => {
      const current = discount.channels.find(
        (item) => item.code === channel.code,
      );
      return {
        ...channel,
        enabled: Boolean(current),
        featured: current?.featured ?? false,
      };
    }),
  };
}

export function validateDiscountEligibilityChannelsForm(
  values: DiscountEligibilityChannelsFormValues,
): string[] {
  if (
    values.buyerContextType === DiscountBuyerContextType.Customers &&
    values.customers.length === 0
  ) {
    return ["Select at least one customer."];
  }
  if (
    values.buyerContextType === DiscountBuyerContextType.Segments &&
    values.segments.length === 0
  ) {
    return ["Select at least one customer segment."];
  }
  return [];
}

export function buildDiscountEligibilityChannelsUpdateInput(
  values: DiscountEligibilityChannelsFormValues,
): ApiDiscountUpdateInput {
  return {
    eligibility: {
      type: values.buyerContextType,
      customerIds:
        values.buyerContextType === DiscountBuyerContextType.Customers
          ? values.customers.map((customer) => customer.id)
          : [],
      segmentIds:
        values.buyerContextType === DiscountBuyerContextType.Segments
          ? values.segments.map((segment) => segment.id)
          : [],
    },
    channels: values.channels
      .filter((channel) => channel.enabled)
      .map((channel) => ({
        code: channel.code,
        featured: channel.featured,
      })),
  };
}
