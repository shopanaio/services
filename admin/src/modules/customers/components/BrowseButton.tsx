import { BrowseCustomers } from '@modules/customers/components/Browse';
import { ICustomer } from '@src/entity/Customer/Customer';
import { Button, ButtonProps } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface ICustomerSelectProps {
  onChange: (value: ICustomer[]) => void;
  value: ICustomer[];
  status?: 'error' | undefined;
  buttonProps?: ButtonProps;
  multiple?: boolean;
}

export const BrowseCustomersButton = ({
  onChange,
  value = [],
  buttonProps,
  multiple,
}: ICustomerSelectProps) => {
  const [browsing, setBrowsing] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      <Button
        children={formatMessage({ id: t('customers.browse.open') })}
        data-testid="browse-customers-button"
        {...buttonProps}
        onClick={() => {
          setBrowsing(true);
        }}
      />
      <BrowseCustomers
        multiple={multiple}
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
      />
    </>
  );
};
