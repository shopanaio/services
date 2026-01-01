export type TCents = number;
export type TDollars = number;

const isValidCents = (cents: any): cents is TCents => {
  return typeof cents === 'number' && Number.isInteger(cents);
};

export const dollarsFromCents = (cents: TCents): TDollars | null => {
  if (!isValidCents(cents)) {
    return null;
  }

  return cents / 100;
};

export const centsFromDollars = (dollars: TDollars): TCents | null => {
  if (typeof dollars !== 'number' || dollars < 0) {
    return null;
  }

  return Math.round(dollars * 100);
};

export const getDiscountPercentage = (
  price: TCents,
  oldPrice: TCents,
): number | null => {
  if (price <= 0 || oldPrice < 0 || oldPrice < price) {
    console.error(
      { oldPrice, price },
      'Invalid input. Please provide valid price and old price values.',
    );

    return null;
  }

  const discount = oldPrice - price;
  const salePercentage = (discount / price) * 100;

  return Math.round(salePercentage);
};

export const toCents = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
};

export const fromCents = (value: number): number => {
  if (!Number.isInteger(value)) {
    return 0;
  }
  return Math.round(value * 0.01);
};

export const formatPrice = (amount: any) => {
  if (!Number.isInteger(amount)) {
    return '';
  }

  return `$${fromCents(amount)}`;
};
