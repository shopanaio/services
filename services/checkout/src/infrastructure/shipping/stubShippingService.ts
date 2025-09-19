import { Money } from "@shopana/money";
import {
  ShippingServicePort,
  ShippingMethod,
  ShippingValidationRequest,
  ShippingValidationResponse,
  ShippingAddress
} from "@src/application/ports/shippingServicePort";

/**
 * Stub implementation of ShippingServicePort for development/testing
 * In production, this would integrate with real shipping providers
 */
export class StubShippingService implements ShippingServicePort {
  private readonly availableMethods: ShippingMethod[] = [
    {
      id: "standard",
      name: "Standard Shipping",
      description: "5-7 business days",
      estimatedDeliveryDays: 7,
      cost: Money.fromMinor(500n), // $5.00
      available: true,
    },
    {
      id: "express",
      name: "Express Shipping",
      description: "2-3 business days",
      estimatedDeliveryDays: 3,
      cost: Money.fromMinor(1500n), // $15.00
      available: true,
    },
    {
      id: "overnight",
      name: "Overnight Shipping",
      description: "Next business day",
      estimatedDeliveryDays: 1,
      cost: Money.fromMinor(2500n), // $25.00
      available: true,
    },
  ];

  async validateShippingMethod(request: ShippingValidationRequest): Promise<ShippingValidationResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const method = this.availableMethods.find(m => m.id === request.shippingMethodId);

    if (!method) {
      return {
        valid: false,
        method: {
          id: request.shippingMethodId,
          name: "Unknown Method",
          description: null,
          estimatedDeliveryDays: null,
          cost: Money.zero(),
          available: false,
        },
        cost: Money.zero(),
        errors: ["Shipping method not found"],
      };
    }

    // Simple validation logic - in real implementation would check:
    // - Address serviceability
    // - Item weight/dimensions restrictions
    // - Availability for specific items
    const isInternational = request.address?.countryCode !== "US";
    const hasHeavyItems = request.lineItems.some(item => (item.weight || 0) > 50);

    if (method.id === "overnight" && isInternational) {
      return {
        valid: false,
        method,
        cost: method.cost,
        errors: ["Overnight shipping not available for international addresses"],
      };
    }

    if (hasHeavyItems && method.id !== "standard") {
      return {
        valid: false,
        method,
        cost: method.cost,
        errors: ["Heavy items can only be shipped via standard shipping"],
      };
    }

    // Calculate dynamic cost based on items (simplified)
    let adjustedCost = method.cost;
    if (request.lineItems.length > 5) {
      adjustedCost = adjustedCost.add(Money.fromMinor(200n)); // $2.00 extra for many items
    }

    return {
      valid: true,
      method,
      cost: adjustedCost,
    };
  }

  async getAvailableShippingMethods(
    checkoutId: string,
    projectId: string,
    address?: ShippingAddress | null
  ): Promise<ShippingMethod[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Filter methods based on address
    let availableMethods = [...this.availableMethods];

    if (address?.countryCode !== "US") {
      // Remove overnight for international
      availableMethods = availableMethods.filter(m => m.id !== "overnight");
    }

    return availableMethods.filter(m => m.available);
  }
}
