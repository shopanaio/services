import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { PaymentActions } from '@modules/orders/components/PaymentItems/PaymentActions';
import { PaymentSummaryData } from '@modules/orders/components/PaymentItems/PaymentSummaryData';
import { PaymentStatusModal } from '@modules/orders/components/StatusConfirmation/PaymentStatusModal';
import { paymentStatuses } from '@modules/orders/defs';
import { IOrderPaymentSummary } from '@src/entity/Order/Order';
import { IPaymentItem } from '@src/entity/Order/PaymentItem';
import { PaymentStatusEnum } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Tag, Typography } from 'antd';
import { useState } from 'react';

export const ActivePaymentSummary = ({
  paymentSummary,
  paymentItem,
  refetch,
}: {
  paymentItem: IPaymentItem;
  paymentSummary: IOrderPaymentSummary;
  refetch: () => Promise<void>;
}) => {
  const [requestStatus, setRequestStatus] = useState<PaymentStatusEnum | null>(
    null,
  );

  const onUpdateStatus = (status: PaymentStatusEnum) => {
    setRequestStatus(status);
  };

  const isPending = paymentItem?.status === PaymentStatusEnum.Pending;
  const isPaid = paymentItem?.status === PaymentStatusEnum.Paid;
  const isCancelled = paymentItem?.status === PaymentStatusEnum.Cancelled;

  return (
    <>
      <PaymentStatusModal
        onClose={() => setRequestStatus(null)}
        open={requestStatus !== null}
        id={paymentItem.id}
        refetch={refetch}
        status={requestStatus}
      />
      <DrawerPaper>
        <DrawerPaperHeader
          name="payment"
          title={
            <Flex gap="2" align="center" w="100%">
              <Typography.Text
                strong
                css={css`
                  font-size: 16px;
                `}
              >
                Payment
              </Typography.Text>
              <Tag
                data-testid="payment-status"
                color={paymentStatuses[paymentItem.status]?.color}
              >
                {paymentStatuses[paymentItem.status]?.label}
              </Tag>
            </Flex>
          }
        />
        <PaymentSummaryData
          paidAmount={isPaid ? paymentItem?.amount : null}
          cancelledAmount={isCancelled ? paymentItem?.amount : null}
          total={paymentSummary?.totalAmount}
          subtotal={paymentSummary?.subtotalAmount}
          costTotal={0}
        />
        {isPending && <PaymentActions onUpdateStatus={onUpdateStatus} />}
      </DrawerPaper>
    </>
  );
};
