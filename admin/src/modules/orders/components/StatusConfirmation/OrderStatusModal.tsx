import { useState } from 'react';
import { OrderStatusEnum } from '@src/graphql';
import { useUpdateOrderStatus } from '@modules/orders/hooks/mutations';
import { IOrder } from '@src/entity/Order/Order';
import { notify } from '@components/feedback/notification';
import { orderStatuses } from '@modules/orders/defs';
import { StatusConfirmationModal } from '@modules/orders/components/StatusConfirmation/StatusModal';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const orderStatusMessageIds = {
  success: {
    [OrderStatusEnum.Draft]: t('orders.statusMessages.success.draft'),
    [OrderStatusEnum.Active]: t('orders.statusMessages.success.active'),
    [OrderStatusEnum.Completed]: t('orders.statusMessages.success.completed'),
    [OrderStatusEnum.Cancelled]: t('orders.statusMessages.success.cancelled'),
    [OrderStatusEnum.Archived]: t('orders.statusMessages.success.archived'),
  },
  error: {
    [OrderStatusEnum.Draft]: t('orders.statusMessages.error.draft'),
    [OrderStatusEnum.Active]: t('orders.statusMessages.error.active'),
    [OrderStatusEnum.Completed]: t('orders.statusMessages.error.completed'),
    [OrderStatusEnum.Cancelled]: t('orders.statusMessages.error.cancelled'),
    [OrderStatusEnum.Archived]: t('orders.statusMessages.error.archived'),
  },
};

const titleIds = {
  [OrderStatusEnum.Draft]: t('orders.statusModals.order.titles.draft'),
  [OrderStatusEnum.Active]: t('orders.statusModals.order.titles.active'),
  [OrderStatusEnum.Completed]: t('orders.statusModals.order.titles.completed'),
  [OrderStatusEnum.Cancelled]: t('orders.statusModals.order.titles.cancelled'),
  [OrderStatusEnum.Archived]: t('orders.statusModals.order.titles.archived'),
};

interface IStatusConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  order: IOrder;
  refetch: () => Promise<void>;
  status: OrderStatusEnum | null;
}

export const OrderStatusConfirmationModal = ({
  status,
  open,
  onClose,
  order,
  refetch,
}: IStatusConfirmationModalProps) => {
  const { updateStatus } = useUpdateOrderStatus();
  const intl = useIntl();

  const [loading, setLoading] = useState(false);

  const onSubmit = async ({ comment }: { comment: string }) => {
    if (!status) {
      return;
    }

    try {
      await setLoading(true);
      await updateStatus({ id: order.id, status, comment });
      await refetch();
      notify.success(intl.formatMessage({ id: orderStatusMessageIds.success[status] }));
      onClose();
    } catch {
      notify.error(intl.formatMessage({ id: orderStatusMessageIds.error[status] }));
    } finally {
      await setLoading(false);
    }
  };

  return (
    <StatusConfirmationModal
      onSubmit={onSubmit}
      statusLabel={orderStatuses[status || OrderStatusEnum.Draft].label}
      loading={loading}
      onClose={onClose}
      open={open}
      title={intl.formatMessage({ id: titleIds[status || OrderStatusEnum.Draft] })}
      type="order"
      isDanger={status === OrderStatusEnum.Cancelled}
    />
  );
};
