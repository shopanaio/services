import { useProductPrice } from '@modules/products/hooks/useProductPrice';
import { Typography } from 'antd';

interface IPriceProps {
  data: any;
  strong?: boolean;
  allowNegative?: boolean;
  'data-testid'?: string;
}

export const Price = ({
  data,
  strong = false,
  'data-testid': dataTestId,
}: IPriceProps) => {
  const pricing = useProductPrice(data);

  return (
    <div data-testid={dataTestId}>
      <Typography.Text strong={strong}>
        {pricing.symbolLeft}
        {pricing.price}
        {pricing.symbolRight}
      </Typography.Text>
    </div>
  );
};

export const PriceRaw = ({ data }: IPriceProps) => {
  const pricing = useProductPrice(data);

  if (pricing.price < 0) {
    return (
      <>
        -{pricing.symbolLeft}
        {Math.abs(pricing.price)}
        {pricing.symbolRight}
      </>
    );
  }

  return (
    <>
      {pricing.symbolLeft}
      {pricing.price}
      {pricing.symbolRight}
    </>
  );
};
