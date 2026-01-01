import { ClientProductSortOptions } from '@modules/products/defs';
import { ListingSort } from '@src/graphql';
import { Select } from 'antd';
import { MdSort } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const OrderBySelect = ({
  value,
  onChange,
  hasCustom,
}: {
  value: ListingSort;
  onChange: (value: ListingSort) => void;
  hasStatusOrder: boolean;
  hasCustom: boolean;
}) => {
  const { formatMessage } = useIntl();
  return (
    <Select
      value={value}
      suffixIcon={<MdSort />}
      data-testid="order-by-select"
      onChange={(value) => {
        onChange(value as ListingSort);
      }}
      options={Object.values(ClientProductSortOptions)
        .filter((it) => {
          if (it.key === ListingSort.Custom) {
            return hasCustom;
          }

          return true;
        })
        .map((it) => ({
          label: it.label,
          value: it.key,
        }))}
      placeholder={formatMessage({ id: t('common.selectOption') })}
    />
  );
};
