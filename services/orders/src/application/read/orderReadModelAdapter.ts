import { OrderState, OrderLineItemState, OrderDeliveryGroup as DomainOrderDeliveryGroup, OrderPromoCode as DomainOrderPromoCode, OrderDeliveryAddress as DomainOrderDeliveryAddress, OrderDeliveryMethod as DomainOrderDeliveryMethod, OrderStatus, AppliedDiscount } from "@src/domain/order/evolve";
import { OrderReadView, OrderDeliveryGroup, OrderPromoCode, OrderDeliveryAddress, OrderDeliveryMethod } from "./orderReadRepository";
import { OrderLineItemReadView } from "./orderLineItemsReadRepository";
import { DeliveryMethodType, ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";
import { DiscountType } from "@shopana/pricing-plugin-sdk";

/**
 * Adapter for converting data from read model to OrderState domain model format
 */
export class OrderReadModelAdapter {
  /**
   * Converts OrderReadView to OrderState
   */
  static toOrderState(readView: OrderReadView): OrderState {
    return {
      id: readView.id,
      exists: true, // If data exists in read model, order exists
      projectId: readView.projectId,
      currencyCode: readView.currencyCode,
      idempotencyKey: "", // Not available in read model, setting default
      salesChannel: readView.salesChannel || "",
      externalSource: readView.externalSource,
      externalId: readView.externalId,
      localeCode: readView.localeCode,
      createdAt: readView.createdAt,
      updatedAt: readView.updatedAt,
      subtotal: readView.subtotal,
      grandTotal: readView.grandTotal,
      totalQuantity: readView.totalQuantity,
      apiKey: readView.apiKeyId || "", // Map apiKeyId to apiKey
      createdBy: readView.adminId, // Map adminId to createdBy
      number: null, // Not available in read model
      status: OrderReadModelAdapter.mapStatus(readView.status),
      expiresAt: readView.expiresAt,
      version: Number(readView.projectedVersion), // Convert bigint to number
      metadata: readView.metadata || {},
      deletedAt: readView.deletedAt,
      customerEmail: readView.customerEmail,
      customerId: readView.customerId,
      customerPhone: readView.customerPhoneE164, // Map customerPhoneE164 to customerPhone
      customerCountryCode: readView.customerCountryCode,
      customerNote: readView.customerNote,
      deliveryGroups: this.mapDeliveryGroups(readView.deliveryGroups, readView.deliveryAddresses, readView.deliveryMethods),
      appliedPromoCodes: this.mapPromoCodes(readView.appliedPromoCodes),
      discountTotal: readView.discountTotal,
      taxTotal: readView.taxTotal,
      shippingTotal: readView.shippingTotal,
      linesRecord: this.mapLineItemsToLinesRecord(readView.lineItems),
      appliedDiscounts: this.mapPromoCodesToAppliedDiscounts(readView.appliedPromoCodes),
    };
  }

  /** Maps string status from read model to domain enum. */
  private static mapStatus(value: string): OrderStatus {
    switch (value) {
      case "DRAFT":
        return OrderStatus.DRAFT;
      case "ACTIVE":
        return OrderStatus.ACTIVE;
      case "CLOSED":
        return OrderStatus.CLOSED;
      case "CANCELLED":
        return OrderStatus.CANCELLED;
      default:
        return OrderStatus.DRAFT;
    }
  }

  /**
   * Converts lineItems to linesRecord
   */
  private static mapLineItemsToLinesRecord(lineItems: OrderLineItemReadView[]): Record<string, OrderLineItemState> {
    const linesRecord: Record<string, OrderLineItemState> = {};

    for (const item of lineItems) {
      linesRecord[item.id] = {
        lineId: item.id,
        quantity: item.quantity,
        unit: {
          id: item.unit.id,
          price: item.unit.price,
          compareAtPrice: item.unit.compareAtPrice,
          title: item.unit.title,
          imageUrl: item.unit.imageUrl,
          sku: item.unit.sku,
          snapshot: item.unit.snapshot,
        },
      };
    }

    return linesRecord;
  }

  /**
   * Converts delivery groups from read model to domain model
   */
  private static mapDeliveryGroups(
    deliveryGroups: OrderDeliveryGroup[],
    deliveryAddresses: OrderDeliveryAddress[],
    deliveryMethods: OrderDeliveryMethod[]
  ): DomainOrderDeliveryGroup[] {
    return deliveryGroups.map(group => {
      // Find address for this delivery group
      const groupAddress = deliveryAddresses.find(addr => addr.deliveryGroupId === group.id);

      // Find delivery methods for this group
      const groupMethods = deliveryMethods.filter(method => method.deliveryGroupId === group.id);

      // Find selected delivery method
      const selectedMethod = group.selectedDeliveryMethod
        ? groupMethods.find(method => method.code === group.selectedDeliveryMethod)
        : null;

      return {
        id: group.id,
        orderLineIds: group.lineItemIds,
        deliveryAddress: groupAddress ? this.mapDeliveryAddress(groupAddress) : null,
        selectedDeliveryMethod: selectedMethod ? this.mapDeliveryMethod(selectedMethod) : null,
        deliveryMethods: groupMethods.map(method => this.mapDeliveryMethod(method)),
        shippingCost: null, // Not available in read model, may require additional logic
      };
    });
  }

  /**
   * Converts delivery address from read model to domain model
   */
  private static mapDeliveryAddress(address: OrderDeliveryAddress): DomainOrderDeliveryAddress {
    return {
      id: address.id,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      countryCode: address.countryCode,
      provinceCode: address.provinceCode,
      postalCode: address.postalCode,
      email: address.email,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      data: address.metadata,
    };
  }

  /**
   * Converts delivery method from read model to domain model
   */
  private static mapDeliveryMethod(method: OrderDeliveryMethod): DomainOrderDeliveryMethod {
    return {
      code: method.code,
      deliveryMethodType: method.deliveryMethodType as DeliveryMethodType,
      shippingPaymentModel: method.paymentModel as ShippingPaymentModel,
      provider: {
        code: method.code, // Use code as provider code, may need adjustment
        data: {}, // Not available in read model
      },
    };
  }

  /**
   * Converts promo codes from read model to domain model
   */
  private static mapPromoCodes(promoCodes: OrderPromoCode[]): DomainOrderPromoCode[] {
    return promoCodes.map(promoCode => ({
      code: promoCode.code,
      appliedAt: promoCode.appliedAt,
      discountType: promoCode.discountType,
      value: promoCode.value,
      provider: promoCode.provider,
      conditions: promoCode.conditions || null,
    }));
  }

  /**
   * Converts promo codes to applied discounts
   */
  private static mapPromoCodesToAppliedDiscounts(promoCodes: OrderPromoCode[]): AppliedDiscountSnapshot[] {
    return promoCodes.map(promoCode => ({
      code: promoCode.code,
      appliedAt: promoCode.appliedAt,
      type: promoCode.discountType as DiscountType,
      value: promoCode.value,
      provider: promoCode.provider,
    }));
  }
}
