import { Money } from "@shopana/money";
import {
  TaxServicePort,
  TaxCalculationRequest,
  TaxCalculationResponse
} from "@src/application/ports/taxServicePort";

/**
 * Stub implementation of TaxServicePort for development/testing
 * In production, this would integrate with real tax calculation service (Avalara, TaxJar, etc.)
 */
export class StubTaxService implements TaxServicePort {
  private readonly taxRates = new Map<string, number>([
    // US state tax rates (simplified)
    ['US-CA', 0.0875], // California - 8.75%
    ['US-NY', 0.08],   // New York - 8%
    ['US-TX', 0.0625], // Texas - 6.25%
    ['US-FL', 0.06],   // Florida - 6%
    ['US-WA', 0.065],  // Washington - 6.5%
    // International (simplified)
    ['CA', 0.05],      // Canada - 5% (GST only, simplified)
    ['GB', 0.20],      // UK - 20% VAT
    ['DE', 0.19],      // Germany - 19% VAT
    ['FR', 0.20],      // France - 20% VAT
  ]);

  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Determine tax jurisdiction
    const jurisdiction = this.getTaxJurisdiction(request.shippingAddress?.countryCode);
    const taxRate = this.taxRates.get(jurisdiction) || 0;

    if (taxRate === 0) {
      return {
        totalTax: Money.zero(),
        lineItemTaxes: request.lineItems.map(item => ({
          lineId: item.purchasableId, // Simplified - using purchasableId as lineId
          taxAmount: Money.zero(),
        })),
      };
    }

    // Calculate tax on line items
    const lineItemTaxes = request.lineItems.map(item => {
      // Tax on (subtotal - discount) for each line item
      const taxableAmount = item.subtotalAmount.subtract(item.discountAmount);
      const taxAmount = this.calculateTaxAmount(taxableAmount, taxRate);

      return {
        lineId: item.purchasableId, // Simplified
        taxAmount,
      };
    });

    // Calculate total tax
    const totalItemTax = lineItemTaxes.reduce(
      (sum, item) => sum.add(item.taxAmount),
      Money.zero()
    );
    const totalTax = totalItemTax;

    return {
      totalTax,
      lineItemTaxes,
    };
  }

  private getTaxJurisdiction(countryCode?: string | null): string {
    if (!countryCode) return 'UNKNOWN';

    // For US, would need state/zip code for accurate rates
    // For simplicity, using a default US rate
    if (countryCode === 'US') {
      return 'US-CA'; // Default to California rate
    }

    return countryCode;
  }

  private calculateTaxAmount(amount: Money, rate: number): Money {
    const taxMinor = (amount.amountMinor() * BigInt(Math.round(rate * 10000))) / 10000n;
    return Money.fromMinor(taxMinor);
  }
}
