import { Price, PriceRaw } from '@modules/orders/components/Price';

import { Descriptions, Typography } from 'antd';

interface IPaymentSummaryDataProps {
  subtotal: number;
  total: number;
  paidAmount: number | null;
  cancelledAmount: number | null;
  costTotal: number;
}

export const PaymentSummaryData = ({
  subtotal,
  total,
  paidAmount,
  costTotal,
}: IPaymentSummaryDataProps) => {
  const getProfitItem = () => {
    if (!paidAmount) {
      return [];
    }

    const diff = total - paidAmount;
    const profit = paidAmount - (costTotal + diff);
    const margin = Math.round((profit / paidAmount) * 100);

    return [
      {
        label: 'Profit / Margin',
        key: 'profit',
        children: (
          <Typography.Text data-testid="order-summary-profit-amount">
            <PriceRaw data={{ price: profit }} /> / {margin}%
          </Typography.Text>
        ),
      },
    ];
  };

  return (
    <Descriptions
      bordered
      labelStyle={{ width: '50%' }}
      contentStyle={{ width: '50%' }}
      size="small"
      column={1}
      items={[
        {
          key: 'subtotal',
          label: 'Subtotal',
          children: (
            <Price
              data={{ price: subtotal }}
              data-testid="order-summary-subtotal-amount"
            />
          ),
        },
        {
          key: 'discount',
          label: 'Discount',
          children: <Typography.Text type="secondary">Not set</Typography.Text>,
        },
        {
          key: 'shipping',
          label: 'Shipping',
          children: <Typography.Text type="secondary">Not set</Typography.Text>,
        },
        // {
        //   key: 'tax',
        //   label: 'Tax',
        //   children: <Typography.Text type="secondary">Not set</Typography.Text>,
        // },
        {
          key: 'total',
          label: <Typography.Text strong>Total</Typography.Text>,
          children: (
            <Price
              data={{ price: total }}
              data-testid="order-summary-total-amount"
              strong
            />
          ),
        },
        ...(paidAmount
          ? [
              {
                key: 'paidAmount',
                label: (
                  <Typography.Text strong>Paid by customer</Typography.Text>
                ),
                children: (
                  <Typography.Text strong>
                    <Price
                      data={{ price: paidAmount }}
                      data-testid="order-summary-paid-amount"
                    />
                  </Typography.Text>
                ),
              },
            ]
          : []),
        ...getProfitItem(),
      ]}
    />
  );
};
