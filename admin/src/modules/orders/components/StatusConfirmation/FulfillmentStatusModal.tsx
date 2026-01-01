import { useState } from 'react';
import { FulfillmentStatusEnum } from '@src/graphql';
import { useUpdateFulfillmentStatus } from '@modules/orders/hooks/mutations';
import { notify } from '@components/feedback/notification';
import { fulfillmentStatuses } from '@modules/orders/defs';
import { StatusConfirmationModal } from '@modules/orders/components/StatusConfirmation/StatusModal';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const fulfillmentStatusMessageIds = {
  success: {
    [FulfillmentStatusEnum.Cancelled]: t('orders.fulfillmentMessages.success.cancelled'),
    [FulfillmentStatusEnum.Delivered]: t('orders.fulfillmentMessages.success.delivered'),
    [FulfillmentStatusEnum.Fulfilled]: t('orders.fulfillmentMessages.success.fulfilled'),
    [FulfillmentStatusEnum.OnHold]: t('orders.fulfillmentMessages.success.onHold'),
    [FulfillmentStatusEnum.Pending]: t('orders.fulfillmentMessages.success.pending'),
    [FulfillmentStatusEnum.Processing]: t('orders.fulfillmentMessages.success.processing'),
    [FulfillmentStatusEnum.Returned]: t('orders.fulfillmentMessages.success.returned'),
    [FulfillmentStatusEnum.Shipped]: t('orders.fulfillmentMessages.success.shipped'),
  },
  error: {
    [FulfillmentStatusEnum.Cancelled]: t('orders.fulfillmentMessages.error.cancelled'),
    [FulfillmentStatusEnum.Delivered]: t('orders.fulfillmentMessages.error.delivered'),
    [FulfillmentStatusEnum.Fulfilled]: t('orders.fulfillmentMessages.error.fulfilled'),
    [FulfillmentStatusEnum.OnHold]: t('orders.fulfillmentMessages.error.onHold'),
    [FulfillmentStatusEnum.Pending]: t('orders.fulfillmentMessages.error.pending'),
    [FulfillmentStatusEnum.Processing]: t('orders.fulfillmentMessages.error.processing'),
    [FulfillmentStatusEnum.Returned]: t('orders.fulfillmentMessages.error.returned'),
    [FulfillmentStatusEnum.Shipped]: t('orders.fulfillmentMessages.error.shipped'),
  },
};

const titleIds = {
  [FulfillmentStatusEnum.Cancelled]: t('orders.statusModals.fulfillment.titles.cancelled'),
  [FulfillmentStatusEnum.Delivered]: t('orders.statusModals.fulfillment.titles.delivered'),
  [FulfillmentStatusEnum.Fulfilled]: t('orders.statusModals.fulfillment.titles.fulfilled'),
  [FulfillmentStatusEnum.OnHold]: t('orders.statusModals.fulfillment.titles.onHold'),
  [FulfillmentStatusEnum.Pending]: t('orders.statusModals.fulfillment.titles.pending'),
  [FulfillmentStatusEnum.Processing]: t('orders.statusModals.fulfillment.titles.processing'),
  [FulfillmentStatusEnum.Returned]: t('orders.statusModals.fulfillment.titles.returned'),
  [FulfillmentStatusEnum.Shipped]: t('orders.statusModals.fulfillment.titles.shipped'),
};

interface IFulfillmentStatusModalProps {
  open: boolean;
  onClose: () => void;
  id: ID;
  refetch: () => Promise<void>;
  status: FulfillmentStatusEnum | null;
}

export const FulfillmentStatusModal = ({
  status,
  open,
  onClose,
  id,
  refetch,
}: IFulfillmentStatusModalProps) => {
  const { updateFulfillmentStatus } = useUpdateFulfillmentStatus();
  const intl = useIntl();

  const [loading, setLoading] = useState(false);

  const onSubmit = async ({ comment }: { comment: string }) => {
    if (!status) {
      return;
    }

    try {
      await setLoading(true);
      await updateFulfillmentStatus({ id, status, comment });
      await refetch();
      notify.success(
        intl.formatMessage({ id: fulfillmentStatusMessageIds.success[status] }),
      );
      onClose();
    } catch {
      notify.error(
        intl.formatMessage({ id: fulfillmentStatusMessageIds.error[status] }),
      );
    } finally {
      await setLoading(false);
    }
  };

  return (
    <StatusConfirmationModal
      onSubmit={onSubmit}
      statusLabel={
        fulfillmentStatuses[status || FulfillmentStatusEnum.Pending].label
      }
      loading={loading}
      onClose={onClose}
      open={open}
      title={intl.formatMessage({ id: titleIds[status || FulfillmentStatusEnum.Pending] })}
      type="fulfillment"
      isDanger={status === FulfillmentStatusEnum.Cancelled}
    />
  );
};
