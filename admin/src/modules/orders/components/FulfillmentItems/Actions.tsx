import { Flex } from '@components/utility/Flex';

import { FulfillmentStatusEnum } from '@src/graphql';
import { Button, Dropdown, Space } from 'antd';

import { MdMoreHoriz } from 'react-icons/md';

export const SplittingActions = ({
  onFinish,
  disabled,
  onCancel,
}: {
  disabled: boolean;
  onFinish: () => void;
  onCancel: () => void;
}) => {
  return (
    <Flex mt="4" gap="4">
      <Button onClick={onCancel} data-testid="cancel-splitting-button">
        Cancel
      </Button>
      <Button
        disabled={disabled}
        onClick={onFinish}
        data-testid="confirm-splitting-button"
      >
        Split fulfillment
      </Button>
    </Flex>
  );
};

export const FulfillmentActions = ({
  onChangeStatus,
  onShip,
  onSplit,
  onUndoSplit,
}: {
  onShip: () => void;
  onChangeStatus: (status: FulfillmentStatusEnum) => void;
  onUndoSplit: (() => void) | null;
  onSplit: (() => void) | null;
}) => {
  const getMenuItems = () => {
    const items = [
      {
        key: 'fulfill',
        label: 'Mark as fulfilled',
        'data-testid': 'mark-as-fulfilled-item',
        onClick: () => {
          onChangeStatus(FulfillmentStatusEnum.Fulfilled);
        },
      },
      {
        key: 'hold',
        label: 'Hold fulfillment',
        'data-testid': 'hold-fulfillment-item',
        onClick: () => {
          onChangeStatus(FulfillmentStatusEnum.OnHold);
        },
      },
      {
        key: 'cancel',
        label: 'Cancel',
        'data-testid': 'cancel-fulfillment-item',
        onClick: () => {
          onChangeStatus(FulfillmentStatusEnum.Cancelled);
        },
      },
    ];

    if (onSplit) {
      items.push({
        key: 'split',
        label: 'Split fulfillment',
        'data-testid': 'split-fulfillment-item',
        onClick: onSplit,
      });
    }

    if (onUndoSplit) {
      items.push({
        key: 'undo',
        label: 'Undo splitting',
        'data-testid': 'undo-splitting-item',
        onClick: onUndoSplit,
      });
    }

    return items;
  };

  return (
    <Flex mt="4" gap="4">
      <Space.Compact>
        <Button onClick={onShip} data-testid="ship-products-button">
          Ship products
        </Button>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{ items: getMenuItems() }}
        >
          <Button
            icon={<MdMoreHoriz />}
            data-testid="fulfillment-actions-menu"
          />
        </Dropdown>
      </Space.Compact>
    </Flex>
  );
};
