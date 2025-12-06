import type {
  CheckoutState,
  CheckoutDeliveryAddress,
  CheckoutDeliveryGroup,
  CheckoutLineItemState,
  CheckoutDeliveryMethod,
} from "./types";
import type { CheckoutDto, CheckoutLineDto } from "@shopana/checkout-sdk";
import { Money } from "@shopana/shared-money";

/**
 * Handles transformation of aggregate state into CheckoutDto payload
 */
export class CheckoutSerializer {
  toJSON(id: string, state: CheckoutState): CheckoutDto {
    const currency = state.currencyCode || "USD";

    // Build hierarchical line structure from flat linesRecord
    const lineDtos = this.buildHierarchicalLines(state.linesRecord ?? {}, currency);
    const allLineDtos = this.flattenLines(lineDtos);
    const lineDtosById = new Map(allLineDtos.map((line) => [line.id, line]));

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

  /**
   * Build hierarchical line structure from flat linesRecord
   * Parent lines will have their children nested
   */
  private buildHierarchicalLines(
    linesRecord: Record<string, CheckoutLineItemState>,
    fallbackCurrency: string
  ): CheckoutLineDto[] {
    const lines = Object.values(linesRecord);

    // Find parent lines (no parentLineId)
    const parentLines = lines.filter((line) => !line.parentLineId);

    // Build children map by parentLineId
    const childrenByParent = new Map<string, CheckoutLineItemState[]>();
    for (const line of lines) {
      if (line.parentLineId) {
        const children = childrenByParent.get(line.parentLineId) ?? [];
        children.push(line);
        childrenByParent.set(line.parentLineId, children);
      }
    }

    // Serialize parent lines with their children
    return parentLines.map((parent) => {
      const children = childrenByParent.get(parent.lineId) ?? [];
      return this.serializeLine(parent, fallbackCurrency, children);
    });
  }

  /**
   * Flatten hierarchical lines for lookup
   */
  private flattenLines(lines: CheckoutLineDto[]): CheckoutLineDto[] {
    const result: CheckoutLineDto[] = [];
    for (const line of lines) {
      result.push(line);
      if (line.children.length > 0) {
        result.push(...this.flattenLines(line.children));
      }
    }
    return result;
  }

  private serializeLine(
    line: CheckoutLineItemState,
    fallbackCurrency: string,
    children: CheckoutLineItemState[] = []
  ): CheckoutLineDto {
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
      children: children.map((child) =>
        this.serializeLine(child, fallbackCurrency)
      ),
      purchasableId: line.unit.id,
      purchasable: line.unit.snapshot ?? null,
      originalPrice: line.unit.originalPrice?.toJSON() ?? null,
      priceConfig: line.priceConfig
        ? {
            type: line.priceConfig.type,
            amount: line.priceConfig.amount ?? null,
            percent: line.priceConfig.percent ?? null,
          }
        : null,
      tag: line.tag
        ? {
            id: line.tag.id,
            slug: line.tag.slug,
            isUnique: line.tag.isUnique,
          }
        : null,
      parentLineId: line.parentLineId ?? null,
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
      data: address.data,
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
