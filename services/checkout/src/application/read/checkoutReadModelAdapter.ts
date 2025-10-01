import { CheckoutState, CheckoutLineItemState, CheckoutDeliveryGroup as DomainCheckoutDeliveryGroup, CheckoutDeliveryAddress as DomainCheckoutDeliveryAddress, CheckoutDeliveryMethod as DomainCheckoutDeliveryMethod } from "@src/domain/checkout/types";
import { AppliedDiscountSnapshot } from "@src/domain/checkout/discount";
import { CheckoutReadView, CheckoutDeliveryGroup, CheckoutPromoCode, CheckoutDeliveryAddress, CheckoutDeliveryMethod } from "./checkoutReadRepository";
import { CheckoutLineItemReadView } from "./checkoutLineItemsReadRepository";
import { DeliveryMethodType, ShippingPaymentModel } from "@shopana/plugin-sdk/shipping";
import { DiscountType } from "@shopana/plugin-sdk/pricing";

/**
 * Adapter for converting data from read model to CheckoutState domain model format
 */
export class CheckoutReadModelAdapter {
  /**
   * Converts CheckoutReadView to CheckoutState
   */
  static toCheckoutState(readView: CheckoutReadView): CheckoutState {
    return {
      id: readView.id,
      exists: true, // If data exists in read model, checkout exists
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
      status: readView.status,
      expiresAt: readView.expiresAt,
      version: 1,
      metadata: readView.metadata || {},
      deletedAt: readView.deletedAt,
      customerEmail: readView.customerEmail,
      customerId: readView.customerId,
      customerPhone: readView.customerPhoneE164, // Map customerPhoneE164 to customerPhone
      customerCountryCode: readView.customerCountryCode,
      customerNote: readView.customerNote,
      deliveryGroups: this.mapDeliveryGroups(readView.deliveryGroups, readView.deliveryAddresses, readView.deliveryMethods),
      discountTotal: readView.discountTotal,
      taxTotal: readView.taxTotal,
      shippingTotal: readView.shippingTotal,
      linesRecord: this.mapLineItemsToLinesRecord(readView.lineItems),
      appliedDiscounts: this.mapPromoCodesToAppliedDiscounts(readView.appliedPromoCodes),
      payment: this.mapPaymentAggregate(readView),
    };
  }

  /**
   * Converts lineItems to linesRecord
   */
  private static mapLineItemsToLinesRecord(lineItems: CheckoutLineItemReadView[]): Record<string, CheckoutLineItemState> {
    const linesRecord: Record<string, CheckoutLineItemState> = {};

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
    deliveryGroups: CheckoutDeliveryGroup[],
    deliveryAddresses: CheckoutDeliveryAddress[],
    deliveryMethods: CheckoutDeliveryMethod[]
  ): DomainCheckoutDeliveryGroup[] {
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
        checkoutLineIds: group.lineItemIds,
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
  private static mapDeliveryAddress(address: CheckoutDeliveryAddress): DomainCheckoutDeliveryAddress {
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
  private static mapDeliveryMethod(method: CheckoutDeliveryMethod): DomainCheckoutDeliveryMethod {
    return {
      code: method.code,
      deliveryMethodType: method.deliveryMethodType as DeliveryMethodType,
      shippingPaymentModel: method.paymentModel as ShippingPaymentModel,
      provider: {
        code: method.provider,
        data: {}, // Not available in read model
      },
    };
  }

  /**
   * Maps payment aggregate from read model to domain model
   * Returns null if payment data is not available.
   */
  private static mapPaymentAggregate(readView: CheckoutReadView): CheckoutState["payment"] {
    if (!readView.payment) {
      return null;
    }

    const methods = (readView.payment.methods || []).map((m) => ({
      code: m.code,
      provider: m.provider,
      flow: m.flow,
      metadata: m.metadata ?? null,
    }));

    return {
      methods,
      selectedMethod: readView.payment.selectedMethod
        ? readView.payment.selectedMethod.code
        : null,
      payableAmount: readView.payment.payableAmount,
    };
  }

  /**
   * Converts promo codes to applied discounts
   */
  private static mapPromoCodesToAppliedDiscounts(promoCodes: CheckoutPromoCode[]): AppliedDiscountSnapshot[] {
    return promoCodes.map(promoCode => ({
      code: promoCode.code,
      appliedAt: promoCode.appliedAt,
      type: promoCode.discountType as DiscountType,
      value: promoCode.value,
      provider: promoCode.provider,
    }));
  }
}
