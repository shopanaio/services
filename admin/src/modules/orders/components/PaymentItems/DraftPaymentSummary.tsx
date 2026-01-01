import { PaymentSummaryData } from '@modules/orders/components/PaymentItems/PaymentSummaryData';
import { IOrderPaymentSummary } from '@src/entity/Order/Order';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const DraftPaymentSummary = ({
  paymentSummary,
}: {
  paymentSummary: IOrderPaymentSummary;
}) => {
  const intl = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="payment"
        title={intl.formatMessage({ id: t('orders.payment.title') })}
      />
      <PaymentSummaryData
        paidAmount={null}
        cancelledAmount={null}
        total={paymentSummary?.totalAmount}
        subtotal={paymentSummary?.subtotalAmount}
        costTotal={0}
      />
    </DrawerPaper>
  );
};
