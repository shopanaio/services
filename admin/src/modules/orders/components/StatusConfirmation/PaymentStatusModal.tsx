import { useState } from 'react';
import { PaymentStatusEnum } from '@src/graphql';
import { useUpdatePaymentStatus } from '@modules/orders/hooks/mutations';
import { notify } from '@components/feedback/notification';
import { StatusConfirmationModal } from '@modules/orders/components/StatusConfirmation/StatusModal';
import { paymentStatuses } from '@modules/orders/defs';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const paymentStatusMessageIds = {
  success: {
    [PaymentStatusEnum.Cancelled]: t('orders.paymentMessages.success.cancelled'),
    [PaymentStatusEnum.Paid]: t('orders.paymentMessages.success.paid'),
    [PaymentStatusEnum.Pending]: t('orders.paymentMessages.success.pending'),
  },
  error: {
    [PaymentStatusEnum.Cancelled]: t('orders.paymentMessages.error.cancelled'),
    [PaymentStatusEnum.Paid]: t('orders.paymentMessages.error.paid'),
    [PaymentStatusEnum.Pending]: t('orders.paymentMessages.error.pending'),
  },
};

const titleIds = {
  [PaymentStatusEnum.Cancelled]: t('orders.statusModals.payment.titles.cancelled'),
  [PaymentStatusEnum.Paid]: t('orders.statusModals.payment.titles.paid'),
  [PaymentStatusEnum.Pending]: t('orders.statusModals.payment.titles.pending'),
};

interface IStatusConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  id: ID;
  refetch: () => Promise<void>;
  status: PaymentStatusEnum | null;
}

export const PaymentStatusModal = ({
  status,
  open,
  onClose,
  id,
  refetch,
}: IStatusConfirmationModalProps) => {
  const { updatePaymentStatus } = useUpdatePaymentStatus();
  const intl = useIntl();

  const [loading, setLoading] = useState(false);

  const onSubmit = async ({ comment }: { comment: string }) => {
    if (!status) {
      return;
    }

    try {
      await setLoading(true);
      await updatePaymentStatus({ id, status, comment });
      await refetch();
      notify.success(intl.formatMessage({ id: paymentStatusMessageIds.success[status] }));
      onClose();
    } catch {
      notify.error(intl.formatMessage({ id: paymentStatusMessageIds.error[status] }));
    } finally {
      await setLoading(false);
    }
  };

  return (
    <StatusConfirmationModal
      onSubmit={onSubmit}
      statusLabel={paymentStatuses[status || PaymentStatusEnum.Pending].label}
      loading={loading}
      onClose={onClose}
      open={open}
      title={intl.formatMessage({ id: titleIds[status || PaymentStatusEnum.Pending] })}
      type="payment"
      isDanger={status === PaymentStatusEnum.Cancelled}
    />
  );
};
