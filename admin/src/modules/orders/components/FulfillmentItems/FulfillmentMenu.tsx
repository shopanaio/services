import { IconButton } from '@components/IconButton';
import { IShippingItem } from '@src/entity/Order/ShippingItem';

import { FulfillmentStatusEnum } from '@src/graphql';

import { Dropdown } from 'antd';

export const FulfillmentMenu = ({
  status,
  onChangeStatus,
  trackingInfo,
  openShippingInfo,
}: {
  openShippingInfo: () => void;
  isSplitting: boolean;
  onChangeStatus: (status: FulfillmentStatusEnum) => void;
  status: FulfillmentStatusEnum;
  trackingInfo: IShippingItem | null;
}) => {
  const addTrackingItem = {
    key: 'track',
    label: 'Add tracking info',
    'data-testid': 'add-tracking-info-item',
    onClick: openShippingInfo,
  };
  const editTrackingItem = {
    key: 'editTracking',
    label: 'Edit tracking info',
    'data-testid': 'edit-tracking-info-item',
    onClick: openShippingInfo,
  };
  const markAsFulfilledItem = {
    key: 'fulfill',
    label: 'Mark as fulfilled',
    'data-testid': 'fulfill-item',
    onClick: () => {
      onChangeStatus(FulfillmentStatusEnum.Fulfilled);
    },
  };
  const resumeFulfillmentItem = {
    key: 'resume',
    label: 'Resume fulfillment',
    'data-testid': 'resume-fulfillment-item',
    onClick: () => {
      onChangeStatus(
        trackingInfo
          ? FulfillmentStatusEnum.Processing
          : FulfillmentStatusEnum.Pending,
      );
    },
  };
  const markAsShippedItem = {
    key: 'ship',
    label: 'Mark as shipped',
    'data-testid': 'mark-as-shipped-item',
    onClick: () => {
      onChangeStatus(FulfillmentStatusEnum.Shipped);
    },
  };
  const markAsDeliveredItem = {
    key: 'deliver',
    label: 'Mark as delivered',
    'data-testid': 'mark-as-delivered-item',
    onClick: () => {
      onChangeStatus(FulfillmentStatusEnum.Delivered);
    },
  };
  const cancelFulfillmentItem = {
    key: 'cancel',
    label: 'Cancel fulfillment',
    'data-testid': 'cancel-fulfillment-item',
    onClick: () => {
      onChangeStatus(FulfillmentStatusEnum.Cancelled);
    },
  };
  const holdFulfillmentItem = {
    key: 'hold',
    label: 'Hold fulfillment',
    'data-testid': 'hold-fulfillment-item',
    onClick: () => {
      onChangeStatus(FulfillmentStatusEnum.OnHold);
    },
  };

  const mapping = {
    [FulfillmentStatusEnum.Pending]: [
      markAsFulfilledItem,
      holdFulfillmentItem,
      cancelFulfillmentItem,
    ],
    [FulfillmentStatusEnum.OnHold]: [resumeFulfillmentItem],
    [FulfillmentStatusEnum.Processing]: [
      ...(trackingInfo
        ? [
            editTrackingItem,
            markAsShippedItem,
            markAsDeliveredItem,
            markAsFulfilledItem,
            cancelFulfillmentItem,
          ]
        : [addTrackingItem, markAsFulfilledItem, cancelFulfillmentItem]),
    ],
    [FulfillmentStatusEnum.Shipped]: [
      trackingInfo ? editTrackingItem : addTrackingItem,
      markAsDeliveredItem,
      markAsFulfilledItem,
      cancelFulfillmentItem,
    ],
    [FulfillmentStatusEnum.Delivered]: [markAsFulfilledItem],
    [FulfillmentStatusEnum.Fulfilled]: [],
    [FulfillmentStatusEnum.Cancelled]: [],
    [FulfillmentStatusEnum.Returned]: [],
  };

  if (!mapping[status]?.length) {
    return null;
  }

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{ items: mapping[status] || [] }}
    >
      <IconButton icon="menu" data-testid="fulfillment-actions-menu" />
    </Dropdown>
  );
};
