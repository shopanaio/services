import { dollarsFromCents } from '@src/utils/price';

export const useProductPrice = (data: any) => {
  // const defaultCurrency = { code: 'usd' };
  /** Todo: make multi-currency */

  const price = dollarsFromCents(data.price) || 0;
  const symbolLeft = '$';
  const symbolRight = '';

  if (!data.oldPrice) {
    return {
      price,
      symbolLeft,
      symbolRight,
      withDiscount: false,
    };
  }

  const oldPrice = dollarsFromCents(data.oldPrice);
  // const discountPercentage = getDiscountPercentage(price, data.oldPrice);

  return {
    oldPrice,
    // discountPercentage,
    price,
    symbolLeft,
    symbolRight,
    withDiscount: true,
  };
};
