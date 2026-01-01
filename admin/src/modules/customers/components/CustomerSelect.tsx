import { EntitySelect } from '@components/forms/EntitySelect';
import { BrowseCustomers } from '@modules/customers/components/Browse';
import { ICustomer } from '@src/entity/Customer/Customer';
import { useSearch } from '@src/hooks/useSearch';
import { Select, Space } from 'antd';
import { Variant } from 'antd/es/form/hooks/useVariants';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface ICustomerSelectProps {
  onChange: (value: ICustomer[]) => void;
  value: ICustomer[];
  browseType?: 'default' | 'compact' | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  multiple?: boolean;
  variant?: Variant;
}

export const CustomerSelect = ({
  onChange,
  value = [],
  status,
  showValue = false,
  multiple,
  variant,
}: ICustomerSelectProps) => {
  const [browsing, setBrowsing] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      <EntitySelect<ICustomer>
        renderLabel={(it) => {
          if (!it.lastName && !it.firstName) {
            return it.email;
          }

          return `${it.firstName} ${it.lastName}`;
        }}
        variant={variant}
        data-testid="product-select"
        filterOption={false}
        placeholder={formatMessage({ id: t('customers.select.placeholder') })}
        showValue={showValue}
        value={value}
        style={{ width: '100%' }}
        onChange={onChange}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
      />
      <BrowseCustomers
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
        multiple={multiple}
      />
    </>
  );
};
