import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useProductPrice } from '@modules/products/hooks/useProductPrice';
import { Typography } from 'antd';

interface IProductPriceProps {
  data: any;
  onClick?: () => void;
}

export const ProductPrice = ({ data, onClick }: IProductPriceProps) => {
  const pricing = useProductPrice(data);

  if (pricing.withDiscount) {
    return (
      <Flex
        direction="column"
        onClick={onClick}
        css={css`
          cursor: ${onClick ? 'pointer' : 'default'};
        `}
      >
        <Typography.Text
          ellipsis
          type="danger"
          delete
          css={css`
            margin-bottom: -4px;
            font-size: var(--font-size-xs);
          `}
        >
          {pricing.symbolLeft}
          {pricing.oldPrice}
          {pricing.symbolRight}
        </Typography.Text>
        <Typography.Text ellipsis>
          {pricing.symbolLeft}
          {pricing.price}
          {pricing.symbolRight}
        </Typography.Text>
      </Flex>
    );
  }

  return (
    <div
      css={css`
        margin-top: auto;
        cursor: ${onClick ? 'pointer' : 'default'};
      `}
      onClick={onClick}
    >
      <Typography.Text ellipsis>
        {pricing.symbolLeft}
        {pricing.price}
        {pricing.symbolRight}
      </Typography.Text>
    </div>
  );
};
