import { UseCase, type UseCaseDependencies } from "@src/application/usecases/useCase";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import { Money } from "@shopana/shared-money";
import { deserializeCheckout, type CheckoutDto } from "@shopana/checkout-sdk";
import { v7 as uuidv7 } from "uuid";
import type { OrderCreateData } from "@src/repositories/order/OrderRepository";
import type { Repository } from "@src/repositories/Repository";
import type { Delivery, OrderLoyaltyRewardEligibilitySnapshot } from "@shopana/broker-types";

/** Checkout aggregate reconstructed from the immutable placement snapshot. */
type Checkout = ReturnType<typeof deserializeCheckout>;

/**
 * Converts a Money value from checkout-sdk to shared-money Money.
 *
 * The checkout-sdk bundles its own Money class declaration in dist,
 * creating a distinct TypeScript type from @shopana/shared-money's Money
 * (private fields make them structurally incompatible).
 * This helper bridges the two by going through amountMinor + currency code.
 */
function toMoney(value: { amountMinor(): bigint; currency(): { code: string } }): Money {
  return Money.fromMinor(value.amountMinor(), value.currency().code);
}

/**
 * Converts a Money | number union from checkout to the shared-money equivalent.
 */
function toMoneyOrNumber(
  value: number | { amountMinor(): bigint; currency(): { code: string } },
): number | Money {
  if (typeof value === "number") return value;
  return toMoney(value);
}

export interface CreateOrderUseCaseDependencies extends UseCaseDependencies {
  repository: Repository;
}

export interface CreateOrderFromCheckoutPlacementInput {
  orderId: string;
  organizationId: string;
  storeId: string;
  checkoutId: string;
  credentialId: string;
  userId: string | null;
  idempotencyKey: string;
  checkout: CheckoutDto;
  payment: null | {
    code: string;
    title: string;
    provider: string;
    flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
    customerInput: Record<string, unknown> | null;
  };
  loyaltyRewardEligibility: OrderLoyaltyRewardEligibilitySnapshot | null;
  deliveryCommitments: readonly Delivery.DeliveryCommittedGroupSnapshot[];
}

export class CreateOrderUseCase extends UseCase<CreateOrderFromCheckoutPlacementInput, string> {
  constructor(deps: CreateOrderUseCaseDependencies) {
    super(deps);
    this.repository = deps.repository;
  }

  private readonly repository: Repository;

  async execute(input: CreateOrderFromCheckoutPlacementInput): Promise<string> {
    const checkout = deserializeCheckout(input.checkout);
    if (checkout.id !== input.checkoutId || checkout.storeId !== input.storeId) {
      throw new Error("Checkout placement snapshot does not belong to the requested store");
    }
    this.validateCheckout(checkout);
    this.validateLoyaltyRewardEligibility(checkout, input.loyaltyRewardEligibility);
    this.validateDeliveryCommitments(checkout, input.deliveryCommitments);
    return this.repository.txManager.run(() => this.createInTransaction(checkout, input));
  }

  private async createInTransaction(
    checkoutAggregate: Checkout,
    input: CreateOrderFromCheckoutPlacementInput,
  ): Promise<string> {
    const id = input.orderId;

    const idemHit = await this.repository.idempotency.get(input.storeId, input.idempotencyKey);
    if (idemHit?.id) {
      if (idemHit.id !== id) {
        throw new Error("Order placement idempotency key belongs to another order");
      }
      return idemHit.id;
    }

    if (await this.repository.order.exists(id)) {
      throw new Error("Order placement identifier belongs to another order");
    }

    const checkoutSnapshot: CheckoutSnapshot = this.toSnapshotFromCheckout(
      checkoutAggregate,
      input.storeId,
      input.loyaltyRewardEligibility,
    );

    // Build order business data (independent from audit snapshot)
    // Flatten hierarchical lines (parent + children) into a flat array
    const orderLines = this.flattenCheckoutLines(checkoutAggregate.lines);

    const relations = this.buildRelations(id, input.storeId, checkoutAggregate, input.payment);

    const appliedDiscounts: OrderCreateData["appliedDiscounts"] =
      checkoutAggregate.appliedPromoCodes.map((p) => ({
        code: p.code,
        appliedAt: new Date(p.appliedAt),
        type: p.discountType,
        value: toMoneyOrNumber(p.value),
        provider: p.provider,
      }));

    await this.repository.order.create({
      id,
      storeId: input.storeId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      currencyCode: checkoutAggregate.currencyCode ?? checkoutSnapshot.currencyCode,
      salesChannel: checkoutAggregate.salesChannel ?? null,
      externalSource: checkoutAggregate.externalSource ?? null,
      externalId: checkoutAggregate.externalId ?? null,
      localeCode: checkoutAggregate.localeCode ?? null,
      subtotalAmount: toMoney(checkoutAggregate.cost.subtotalAmount),
      totalDiscountAmount: toMoney(checkoutAggregate.cost.totalDiscountAmount),
      totalTaxAmount: toMoney(checkoutAggregate.cost.totalTaxAmount),
      totalShippingAmount: toMoney(checkoutAggregate.cost.totalShippingAmount),
      totalAmount: toMoney(checkoutAggregate.cost.totalAmount),
      checkoutSnapshot,
      lines: orderLines,
      deliveryGroups: checkoutAggregate.deliveryGroups.map((group) => ({
        id: group.id,
        orderLineIds: group.checkoutLines.map((line) => line.id),
      })),
      appliedDiscounts,
      ...relations,
      createdAt: checkoutSnapshot.capturedAt,
    });

    await this.repository.fulfillment.createForOrder({
      organizationId: input.organizationId,
      storeId: input.storeId,
      orderId: id,
      checkoutId: input.checkoutId,
      commitments: input.deliveryCommitments,
      createdAt: checkoutSnapshot.capturedAt.toISOString(),
    });

    return id;
  }

  private validateDeliveryCommitments(
    checkout: Checkout,
    commitments: readonly Delivery.DeliveryCommittedGroupSnapshot[],
  ): void {
    const groups = new Map(checkout.deliveryGroups.map((group) => [group.id, group]));
    if (commitments.length !== groups.size) {
      throw new Error("ORDER_DELIVERY_COMMITMENTS_INCOMPLETE");
    }
    const seenGroups = new Set<string>();
    const seenLines = new Set<string>();
    for (const commitment of commitments) {
      const group = groups.get(commitment.groupId);
      if (!group || seenGroups.has(commitment.groupId)) {
        throw new Error("ORDER_DELIVERY_COMMITMENT_GROUP_INVALID");
      }
      seenGroups.add(commitment.groupId);
      const expected = new Set(group.checkoutLines.map((line) => line.id));
      if (
        commitment.lineIds.length !== expected.size ||
        commitment.lineIds.some((lineId) => !expected.has(lineId))
      ) {
        throw new Error("ORDER_DELIVERY_COMMITMENT_LINES_INVALID");
      }
      for (const lineId of commitment.lineIds) {
        if (seenLines.has(lineId)) throw new Error("ORDER_DELIVERY_COMMITMENT_LINE_DUPLICATE");
        seenLines.add(lineId);
      }
      const packageLines = new Set(
        commitment.packages.flatMap((item) => item.items.map((line) => line.lineId)),
      );
      if ([...packageLines].some((lineId) => !expected.has(lineId))) {
        throw new Error("ORDER_DELIVERY_COMMITMENT_PACKAGE_LINES_INVALID");
      }
      const checkoutLines = new Map(group.checkoutLines.map((line) => [line.id, line]));
      const packagedQuantities = new Map<string, number>();
      for (const item of commitment.packages.flatMap(({ items }) => items)) {
        const checkoutLine = checkoutLines.get(item.lineId);
        if (!checkoutLine || checkoutLine.purchasableId !== item.variantId)
          throw new Error("ORDER_DELIVERY_COMMITMENT_PACKAGE_ITEM_INVALID");
        packagedQuantities.set(
          item.lineId,
          (packagedQuantities.get(item.lineId) ?? 0) + item.quantity,
        );
      }
      if (
        [...packagedQuantities].some(
          ([lineId, quantity]) => quantity > checkoutLines.get(lineId)!.quantity,
        )
      ) {
        throw new Error("ORDER_DELIVERY_COMMITMENT_PACKAGE_QUANTITY_INVALID");
      }
    }
  }

  private buildRelations(
    orderId: string,
    storeId: string,
    checkoutAggregate: Checkout,
    payment: CreateOrderFromCheckoutPlacementInput["payment"],
  ): Pick<
    OrderCreateData,
    | "contact"
    | "deliveryAddresses"
    | "recipients"
    | "deliveryGroupMappings"
    | "deliveryMethods"
    | "selectedDeliveryMethods"
    | "paymentMethods"
    | "selectedPaymentMethod"
  > {
    const deliveryGroups = checkoutAggregate.deliveryGroups.filter(
      (group) => group.deliveryAddress,
    );

    const contact = {
      storeId,
      orderId,
      firstName: checkoutAggregate.customerIdentity.firstName ?? null,
      lastName: checkoutAggregate.customerIdentity.lastName ?? null,
      middleName: checkoutAggregate.customerIdentity.middleName ?? null,
      customerId: checkoutAggregate.customerIdentity.customer?.id ?? null,
      customerEmail: checkoutAggregate.customerIdentity.email ?? null,
      customerPhoneE164: checkoutAggregate.customerIdentity.phone ?? null,
      customerNote: checkoutAggregate.customerNote ?? null,
      countryCode: checkoutAggregate.customerIdentity.countryCode ?? null,
      metadata: null,
      expiresAt: null,
    } satisfies OrderCreateData["contact"];

    const deliveryAddresses: OrderCreateData["deliveryAddresses"] = [];
    const recipients: OrderCreateData["recipients"] = [];
    const deliveryGroupMappings: OrderCreateData["deliveryGroupMappings"] = [];
    const deliveryMethods: OrderCreateData["deliveryMethods"] = [];
    const selectedDeliveryMethods: OrderCreateData["selectedDeliveryMethods"] = [];

    for (const group of deliveryGroups) {
      const address = group.deliveryAddress!;

      const addrId = uuidv7();
      const recipientId = uuidv7();

      deliveryAddresses.push({
        id: addrId,
        address1: address.address1,
        address2: address.address2 ?? null,
        city: address.city,
        countryCode: address.countryCode,
        provinceCode: address.provinceCode ?? null,
        postalCode: address.postalCode ?? null,
        metadata: (address.data as Record<string, unknown> | null) ?? null,
      });

      recipients.push({
        id: recipientId,
        storeId,
        firstName: address.firstName ?? null,
        lastName: address.lastName ?? null,
        middleName: null,
        email: address.email ?? null,
        phone: address.phone ?? null,
        metadata: null,
      });

      deliveryGroupMappings.push({
        deliveryGroupId: group.id,
        addressId: addrId,
        recipientId: recipientId,
      });
    }

    // Collect all delivery methods from all groups
    for (const group of checkoutAggregate.deliveryGroups) {
      for (const method of group.deliveryMethods) {
        deliveryMethods.push({
          code: method.code,
          provider: method.provider.code,
          deliveryGroupId: group.id,
          deliveryMethodType: method.deliveryMethodType,
          paymentModel: method.shippingPaymentModel ?? null,
          metadata: null,
          customerInput: (method.provider.data as Record<string, unknown> | null) ?? null,
        });
      }

      // Store selected delivery method
      if (group.selectedDeliveryMethod) {
        selectedDeliveryMethods.push({
          deliveryGroupId: group.id,
          code: group.selectedDeliveryMethod.code,
          provider: group.selectedDeliveryMethod.provider.code,
        });
      }
    }

    return {
      contact,
      deliveryAddresses,
      recipients,
      deliveryGroupMappings,
      deliveryMethods,
      selectedDeliveryMethods,
      paymentMethods: payment
        ? [
            {
              code: payment.code,
              provider: payment.provider,
              title: payment.title,
              flow: payment.flow,
              providerData: {},
              customerInput: payment.customerInput,
            },
          ]
        : [],
      selectedPaymentMethod: payment ? { code: payment.code, provider: payment.provider } : null,
    };
  }

  /**
   * Builds audit-focused snapshot from Checkout aggregate.
   * Keeps only business-critical data for disputes and audits.
   */
  private toSnapshotFromCheckout(
    aggregate: Checkout,
    storeId: string,
    loyaltyRewardEligibility: OrderLoyaltyRewardEligibilitySnapshot | null,
  ): CheckoutSnapshot {
    const snapshot: CheckoutSnapshot = {
      checkoutId: aggregate.id,
      storeId,
      currencyCode: aggregate.currencyCode ?? aggregate.cost.totalAmount.currency().code,
      externalSource: aggregate.externalSource ?? null,
      externalId: aggregate.externalId ?? null,
      capturedAt: new Date(),
      customer: {
        customerId: aggregate.customerIdentity.customer?.id ?? null,
        countryCode: aggregate.customerIdentity.countryCode ?? null,
      },
      lines: aggregate.lines.map((l) => ({
        quantity: l.quantity,
        unit: {
          price: toMoney(l.cost.unitPrice),
          title: l.title,
          sku: l.sku ?? null,
        },
      })),
      deliveryGroups: aggregate.deliveryGroups.map((g) => ({
        checkoutLineIds: g.checkoutLines.map((cl) => cl.id),
        deliveryAddress: g.deliveryAddress
          ? {
              countryCode: g.deliveryAddress.countryCode,
              provinceCode: g.deliveryAddress.provinceCode ?? null,
              postalCode: g.deliveryAddress.postalCode ?? null,
            }
          : null,
        selectedDeliveryMethod: g.selectedDeliveryMethod
          ? {
              code: g.selectedDeliveryMethod.code,
              deliveryMethodType: g.selectedDeliveryMethod.deliveryMethodType,
              provider: {
                code: g.selectedDeliveryMethod.provider.code,
              },
            }
          : null,
        shippingCost: g.shippingCost?.amount
          ? {
              amount: toMoney(g.shippingCost.amount),
              paymentModel: g.shippingCost.paymentModel ?? null,
            }
          : null,
      })),
      appliedPromoCodes: aggregate.appliedPromoCodes.map((p) => ({
        code: p.code,
        appliedAt: new Date(p.appliedAt),
        discountType: p.discountType,
        value: toMoneyOrNumber(p.value),
        provider: p.provider,
      })),
      loyaltyRewardEligibility,
    };
    return snapshot;
  }

  protected validateCheckout(aggregate: Checkout): void {
    if (aggregate.status !== "ready") {
      throw new Error("ORDER_CHECKOUT_NOT_READY");
    }
    if (!aggregate.lines.length) {
      throw new Error("ORDER_CHECKOUT_EMPTY");
    }
    if (!aggregate.currencyCode || aggregate.currencyCode.length !== 3) {
      throw new Error("ORDER_CHECKOUT_CURRENCY_INVALID");
    }
    if (aggregate.totalQuantity !== aggregate.lines.reduce((sum, line) => sum + line.quantity, 0)) {
      throw new Error("ORDER_CHECKOUT_QUANTITY_MISMATCH");
    }
    const amounts = [
      aggregate.cost.subtotalAmount,
      aggregate.cost.totalDiscountAmount,
      aggregate.cost.totalTaxAmount,
      aggregate.cost.totalShippingAmount,
      aggregate.cost.totalAmount,
    ];
    if (amounts.some((amount) => amount.amountMinor() < 0n)) {
      throw new Error("ORDER_CHECKOUT_TOTAL_INVALID");
    }
    if (amounts.some((amount) => amount.currency().code !== aggregate.currencyCode)) {
      throw new Error("ORDER_CHECKOUT_CURRENCY_MISMATCH");
    }
  }

  private validateLoyaltyRewardEligibility(
    checkout: Checkout,
    snapshot: OrderLoyaltyRewardEligibilitySnapshot | null,
  ): void {
    if (!snapshot) return;
    if (
      checkout.customerIdentity.customer?.id !== snapshot.customerId ||
      checkout.currencyCode !== snapshot.currencyCode ||
      checkout.salesChannel !== snapshot.channelCode
    ) {
      throw new Error("Order loyalty reward snapshot does not match checkout identity");
    }
    const checkoutLines = new Map(
      this.flattenCheckoutAggregateLines(checkout.lines).map((line) => [line.id, line]),
    );
    let totalAfterProductDiscounts = 0n;
    let totalAfterAllDiscounts = 0n;
    for (const line of snapshot.lines) {
      const checkoutLine = checkoutLines.get(line.orderLineId);
      if (!checkoutLine || checkoutLine.quantity !== line.quantity) {
        throw new Error("Order loyalty reward line does not match checkout");
      }
      const afterAllDiscounts = checkoutLine.cost.totalAmount.amountMinor();
      const afterProductDiscounts = BigInt(line.eligibleAmountAfterProductDiscountsMinor);
      if (
        afterAllDiscounts.toString() !== line.eligibleAmountAfterAllDiscountsMinor ||
        afterProductDiscounts < afterAllDiscounts ||
        afterProductDiscounts > checkoutLine.cost.subtotalAmount.amountMinor()
      ) {
        throw new Error("Order loyalty reward amount does not match checkout");
      }
      totalAfterProductDiscounts += afterProductDiscounts;
      totalAfterAllDiscounts += afterAllDiscounts;
    }
    if (
      totalAfterProductDiscounts.toString() !== snapshot.eligibleAmountAfterProductDiscountsMinor ||
      totalAfterAllDiscounts.toString() !== snapshot.eligibleAmountAfterAllDiscountsMinor
    ) {
      throw new Error("Order loyalty reward total does not match its lines");
    }
  }

  private flattenCheckoutAggregateLines(lines: Checkout["lines"]): Checkout["lines"] {
    return lines.flatMap((line) => [
      line,
      ...this.flattenCheckoutAggregateLines(line.children ?? []),
    ]);
  }

  /**
   * Flattens hierarchical checkout lines (parent + children) into a flat array for order lines.
   * Parent lines are included first, followed by their children with parentLineId set.
   */
  private flattenCheckoutLines(lines: Checkout["lines"]): OrderCreateData["lines"][number][] {
    const result: OrderCreateData["lines"][number][] = [];

    for (const line of lines) {
      // Add the current line
      result.push({
        lineId: line.id,
        quantity: line.quantity,
        unit: {
          id: line.purchasableId,
          price: toMoney(line.cost.unitPrice),
          compareAtPrice: line.cost.compareAtUnitPrice
            ? toMoney(line.cost.compareAtUnitPrice)
            : null,
          title: line.title,
          sku: line.sku ?? null,
          imageUrl: line.imageSrc ?? null,
          snapshot: (line.purchasable as Record<string, unknown> | null) ?? null,
        },
      });

      // Recursively add children with current line as parent
      if (line.children && line.children.length > 0) {
        result.push(...this.flattenCheckoutLines(line.children));
      }
    }

    return result;
  }
}
