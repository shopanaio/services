import type {
  CheckoutState,
  CheckoutDeliveryAddress,
  CheckoutDeliveryGroup,
  CheckoutLineItemState,
  CheckoutDeliveryMethod,
} from "./types";
import type { CheckoutDto } from "@shopana/checkout-sdk";
import { Money } from "@shopana/shared-money";

/**
 * Handles transformation of aggregate state into CheckoutDto payload
 */
export class CheckoutSerializer {
  toJSON(id: string, state: CheckoutState): CheckoutDto {
    const currency = state.currencyCode || "USD";
    const lineDtos = Object.values(state.linesRecord ?? {}).map((line) =>
      this.serializeLine(line, currency)
    );
    const lineDtosById = new Map(lineDtos.map((line) => [line.id, line]));

    const deliveryGroupDtos = (state.deliveryGroups ?? []).map((group) =>
      this.serializeDeliveryGroup(group, lineDtosById)
    );

    return {
      id,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      projectId: state.projectId,
      currencyCode: state.currencyCode,
      idempotencyKey: state.idempotencyKey,
      salesChannel: state.salesChannel,
      externalSource: state.externalSource,
      externalId: state.externalId,
      localeCode: state.localeCode,
      cost: {
        subtotalAmount: state.subtotal.toJSON(),
        totalDiscountAmount: state.discountTotal.toJSON(),
        totalTaxAmount: state.taxTotal.toJSON(),
        totalShippingAmount: state.shippingTotal.toJSON(),
        totalAmount: state.grandTotal.toJSON(),
      },
      customerIdentity: {
        countryCode: state.customerCountryCode,
        customer: state.customerId ? { id: state.customerId } : null,
        email: state.customerEmail,
        phone: state.customerPhone,
        firstName: state.customerFirstName,
        lastName: state.customerLastName,
        middleName: state.customerMiddleName,
      },
      customerNote: state.customerNote,
      totalQuantity: state.totalQuantity,
      lines: lineDtos,
      notifications: [],
      deliveryGroups: deliveryGroupDtos,
      appliedPromoCodes: (state.appliedDiscounts ?? []).map((discount) => ({
        code: discount.code,
        appliedAt: discount.appliedAt.toISOString(),
        discountType: discount.type,
        value:
          typeof discount.value === "number"
            ? discount.value
            : discount.value.toJSON(),
        provider: discount.provider,
        conditions: null,
      })),
      apiKey: state.apiKey,
      createdBy: state.createdBy,
      number: state.number,
      status: state.status,
      expiresAt: state.expiresAt ? state.expiresAt.toISOString() : null,
      version: state.version,
      metadata: state.metadata,
      deletedAt: state.deletedAt ? state.deletedAt.toISOString() : null,
    };
  }

  private serializeLine(
    line: CheckoutLineItemState,
    fallbackCurrency: string
  ): CheckoutDto["lines"][number] {
    const unitPriceSnapshot = line.unit.price.toJSON();
    const currencyCode = unitPriceSnapshot.currency.code || fallbackCurrency;
    const subtotal = line.unit.price.multiply(line.quantity);
    const total = subtotal;
    const zeroSnapshot = Money.zero(currencyCode).toJSON();
    const compareAtSnapshot = line.unit.compareAtPrice
      ? line.unit.compareAtPrice.toJSON()
      : null;

    return {
      id: line.lineId,
      title: line.unit.title,
      sku: line.unit.sku ?? null,
      imageSrc: line.unit.imageUrl ?? null,
      quantity: line.quantity,
      cost: {
        compareAtUnitPrice: compareAtSnapshot,
        unitPrice: unitPriceSnapshot,
        discountAmount: zeroSnapshot,
        subtotalAmount: subtotal.toJSON(),
        taxAmount: zeroSnapshot,
        totalAmount: total.toJSON(),
      },
      children: [],
      purchasableId: line.unit.id,
      purchasable: line.unit.snapshot ?? null,
    };
  }

  private serializeDeliveryGroup(
    group: CheckoutDeliveryGroup,
    lineDtosById: Map<string, CheckoutDto["lines"][number]>
  ): CheckoutDto["deliveryGroups"][number] {
    const checkoutLines = group.checkoutLineIds
      .map((lineId) => lineDtosById.get(lineId))
      .filter((line): line is CheckoutDto["lines"][number] => Boolean(line));

    return {
      id: group.id,
      checkoutLines,
      deliveryAddress: group.deliveryAddress
        ? this.serializeDeliveryAddress(group.deliveryAddress)
        : null,
      deliveryMethods: group.deliveryMethods.map((method) =>
        this.serializeDeliveryMethod(method)
      ),
      selectedDeliveryMethod: group.selectedDeliveryMethod
        ? this.serializeDeliveryMethod(group.selectedDeliveryMethod)
        : null,
      shippingCost: group.shippingCost?.amount
        ? {
            amount: group.shippingCost.amount.toJSON(),
            paymentModel: group.shippingCost.paymentModel,
          }
        : null,
    };
  }

  private serializeDeliveryAddress(
    address: CheckoutDeliveryAddress
  ): NonNullable<CheckoutDto["deliveryGroups"][number]["deliveryAddress"]> {
    return {
      id: address.id,
      address1: address.address1,
      address2: address.address2 ?? null,
      city: address.city,
      countryCode: address.countryCode,
      provinceCode: address.provinceCode ?? null,
      postalCode: address.postalCode ?? null,
      email: address.email ?? null,
      firstName: address.firstName ?? null,
      lastName: address.lastName ?? null,
      phone: address.phone ?? null,
      data: address.data ?? undefined,
    };
  }

  private serializeDeliveryMethod(
    method: CheckoutDeliveryMethod
  ): CheckoutDto["deliveryGroups"][number]["deliveryMethods"][number] {
    return {
      code: method.code,
      deliveryMethodType: method.deliveryMethodType,
      shippingPaymentModel: method.shippingPaymentModel,
      provider: {
        code: method.provider.code,
        data: method.provider.data,
      },
    };
  }
}
