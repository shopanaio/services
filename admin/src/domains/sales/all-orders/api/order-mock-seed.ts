import { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus, type ApiOrder, type ApiOrderAddress, type ApiOrderItem } from "../graphql/operation-types";

const names = [["Olivia", "Martin"], ["Noah", "Williams"], ["Emma", "Johnson"], ["Liam", "Brown"], ["Ava", "Davis"], ["Ethan", "Wilson"], ["Mia", "Anderson"], ["Lucas", "Taylor"]] as const;
const products = ["Linen overshirt", "Trail sneakers", "Ceramic mug", "Canvas backpack", "Wool scarf", "Desk lamp"];
const countries = ["UA", "US", "GB", "DE", "FR"];

function address(index: number, firstName: string, lastName: string): ApiOrderAddress {
  return { id: `address-${index}`, firstName, lastName, company: index % 4 ? null : "Acme Studio", address1: `${18 + index} Market Street`, address2: null, city: ["Kyiv", "Austin", "London", "Berlin", "Paris"][index % 5]!, province: null, postalCode: `${10000 + index * 41}`, countryCode: countries[index % countries.length]!, phone: `+380 50 555 ${String(1000 + index)}` };
}

function item(orderIndex: number, itemIndex: number, createdAt: string): ApiOrderItem {
  const quantity = orderIndex === 35 ? 2 + itemIndex : 1 + ((orderIndex + itemIndex) % 3);
  const price = 24 + ((orderIndex * 13 + itemIndex * 17) % 120);
  const title = products[(orderIndex + itemIndex) % products.length]!;
  return { id: `item-${orderIndex}-${itemIndex}`, price, quantity, originalQuantity: quantity, fulfillmentQuantity: orderIndex % 3 === 0 ? 1 : null, totalAmount: price * quantity, subtotalAmount: price * quantity, taxAmount: orderIndex % 2 ? price * quantity * 0.2 : null, discountAmount: orderIndex % 4 === 0 ? 5 : null, productCostPrice: Math.round(price * 0.55), weight: { value: 250 + itemIndex * 120, unit: "g" }, product: { id: `product-${(orderIndex + itemIndex) % products.length}`, title, sku: `SKU-${orderIndex}-${itemIndex}`, thumbnailUrl: null }, createdAt };
}

export function createOrderMockSeed(): ApiOrder[] {
  const orderStatuses = Object.values(OrderStatus);
  const paymentStatuses = Object.values(OrderPaymentStatus);
  const fulfillmentStatuses = Object.values(OrderFulfillmentStatus);
  return Array.from({ length: 36 }, (_, index) => {
    const [firstName, lastName] = names[index % names.length]!;
    const createdAt = new Date(Date.UTC(2026, 4 + (index % 3), 1 + (index % 27), 8 + (index % 8))).toISOString();
    const updatedAt = new Date(new Date(createdAt).getTime() + (index + 1) * 3_600_000).toISOString();
    // Every PENDING fulfillment has enough rows to exercise split/undo flows.
    const orderItems = Array.from({ length: index % 8 === 0 ? 3 : 1 + (index % 4) }, (_, itemIndex) => item(index, itemIndex, createdAt));
    const subtotalAmount = orderItems.reduce((sum, value) => sum + value.subtotalAmount, 0);
    const discountAmount = index % 4 === 0 ? 5 : 0;
    const shippingAmount = index % 6 === 0 ? 0 : 9;
    const taxAmount = index % 2 ? subtotalAmount * 0.2 : 0;
    const totalAmount = subtotalAmount - discountAmount + shippingAmount + taxAmount;
    // Keep the newest/default row as a fully actionable old-UI scenario.
    const status = index === 35 ? OrderStatus.Active : orderStatuses[index % orderStatuses.length]!;
    const paymentStatus = index === 35 ? OrderPaymentStatus.Pending : paymentStatuses[index % paymentStatuses.length]!;
    const fulfillmentStatus = index === 35 ? OrderFulfillmentStatus.Pending : fulfillmentStatuses[index % fulfillmentStatuses.length]!;
    const guest = index % 9 === 0;
    const noMethods = index % 11 === 0;
    const baseFulfillment = { id: `fulfillment-${index}-1`, parentId: null, status: fulfillmentStatus, orderItems: orderItems.slice(0, Math.max(1, orderItems.length - 1)), shippingItem: noMethods ? null : { id: `shipping-${index}-1`, shippingMethod: { id: index % 2 ? "express" : "standard", name: index % 2 ? "Express" : "Standard", price: shippingAmount }, trackingCode: index % 3 ? `TRACK${10000 + index}` : null, trackingUrl: index % 3 ? `https://tracking.example/${10000 + index}` : null, estimatedDeliveryAt: null }, createdAt, updatedAt };
    const fulfillments = index % 8 === 0 && orderItems.length > 1 ? [baseFulfillment, { ...baseFulfillment, id: `fulfillment-${index}-2`, parentId: baseFulfillment.id, orderItems: orderItems.slice(-1), shippingItem: null, status: OrderFulfillmentStatus.Pending }] : [baseFulfillment];
    return {
      id: `order-${String(index + 1).padStart(3, "0")}`, version: 1, orderNumber: 1040 + index, status, createdAt, updatedAt,
      adminNote: index % 4 === 0 ? "Review delivery instructions before dispatch." : null, externalSystemId: index % 5 === 0 ? `ERP-${8000 + index}` : null,
      currencyCode: ["USD", "EUR", "UAH"][index % 3]!, displayCurrencyCode: null, displayExchangeRate: null,
      customer: guest ? null : { id: `customer-${index + 1}`, displayName: `${firstName} ${lastName}`, email: `${firstName}.${lastName}${index}@example.com`.toLowerCase(), phone: `+380 50 555 ${1000 + index}` },
      customerDetails: { firstName, lastName, middleName: null, email: `${firstName}.${lastName}${index}@example.com`.toLowerCase(), phone: index % 5 === 0 ? null : `+380 50 555 ${1000 + index}`, note: index % 6 === 0 ? "Prefers contact by email." : null, meta: null },
      customerStatistic: guest ? null : { ordersCount: 1 + (index % 12), totalSpent: totalAmount * (1 + (index % 12)) },
      billingAddress: noMethods ? null : address(index, firstName, lastName), shippingAddress: noMethods ? null : address(index + 100, firstName, lastName),
      paymentMethod: noMethods ? null : { id: index % 2 ? "card" : "cod", name: index % 2 ? "Credit card" : "Cash on delivery" },
      shippingMethod: noMethods ? null : { id: index % 2 ? "express" : "standard", name: index % 2 ? "Express" : "Standard", price: shippingAmount },
      orderItems, productsInfo: orderItems.map((value) => value.product), fulfillments,
      paymentItem: noMethods ? null : { id: `payment-${index}`, status: paymentStatus, amount: totalAmount, method: { id: index % 2 ? "card" : "cod", name: index % 2 ? "Credit card" : "Cash on delivery" } },
      paymentSummary: { subtotalAmount, discountAmount, shippingAmount, taxAmount, totalAmount, paidAmount: paymentStatus === OrderPaymentStatus.Paid ? totalAmount : 0 },
      events: [{ id: `event-${index}-1`, type: "SYSTEM", message: "Order created", actorName: "Shopana", createdAt }, ...(index % 4 === 0 ? [{ id: `event-${index}-2`, type: "COMMENT" as const, message: "Customer confirmed delivery window.", actorName: "Support team", createdAt: updatedAt }] : [])],
      tags: [{ id: index % 2 ? "priority" : "online", name: index % 2 ? "priority" : "online" }, ...(index % 7 === 0 ? [{ id: "manual-review", name: "manual-review" }] : [])],
    };
  });
}
