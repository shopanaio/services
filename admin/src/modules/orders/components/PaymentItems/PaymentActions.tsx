import { Flex } from '@components/utility/Flex';

import { PaymentStatusEnum } from '@src/graphql';
import { Button, Dropdown, Space } from 'antd';
import { MdMoreHoriz } from 'react-icons/md';

interface IPaymentActionsProps {
  onUpdateStatus: (status: PaymentStatusEnum) => void;
}

export const PaymentActions = ({ onUpdateStatus }: IPaymentActionsProps) => {
  return (
    <Flex mt="4">
      <Space.Compact>
        <Button
          data-testid="mark-as-paid-button"
          onClick={() => {
            onUpdateStatus(PaymentStatusEnum.Paid);
          }}
        >
          Mark as paid
        </Button>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              {
                key: '2',
                label: 'Cancel payment',
                onClick: () => {
                  onUpdateStatus(PaymentStatusEnum.Cancelled);
                },
                // @ts-expect-error
                'data-testid': 'cancel-payment-item',
              },
            ],
          }}
        >
          <Button icon={<MdMoreHoriz />} data-testid="payment-actions-menu" />
        </Dropdown>
      </Space.Compact>
    </Flex>
  );
};
