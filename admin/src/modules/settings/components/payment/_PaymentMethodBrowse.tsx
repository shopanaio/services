import { EntitySelect } from '@components/forms/EntitySelect';
import { IPaymentMethod } from '@src/entity/PaymentMethod/PaymentMethod';
import { Space } from 'antd';
import { Variant } from 'antd/es/form/hooks/useVariants';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IPaymentMethodSelectProps {
  onChange: (value: IPaymentMethod[]) => void;
  value: IPaymentMethod[];
  status?: 'error' | undefined;
  showValue?: boolean;
  placeholder?: string;
  variant?: Variant;
  multiple?: boolean;
}

export const _PaymentMethodSelect = ({
  onChange,
  value,
  status,
  showValue = false,
  variant,
  multiple,
}: IPaymentMethodSelectProps) => {
  const [browsing, setBrowsing] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <Space.Compact style={{ width: '100%' }}>
      <EntitySelect<IPaymentMethod>
        showValue={showValue}
        renderLabel={(it) => it.name}
        variant={variant}
        data-testid="payment-method-select"
        filterOption={false}
        placeholder={formatMessage({ id: t('orders.paymentDetails.method.placeholder') })}
        value={value}
        style={{ width: '100%' }}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
        onChange={onChange}
      />
    </Space.Compact>
  );
};
