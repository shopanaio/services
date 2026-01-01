import { EntitySelect } from '@components/forms/EntitySelect';
import { BrowseCategories } from '@modules/categories/components/BrowseCategories';
import { IBrowseCategory } from '@src/entity/Category/BrowseCategory';
import { Variant } from 'antd/es/config-provider';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface ICategorySelectProps {
  onChange: (value: IBrowseCategory[]) => void;
  value: IBrowseCategory[];
  browseType?: 'default' | 'compact' | null;
  status?: 'error' | undefined;
  multiple?: boolean;
  variant?: Variant;
  showValue?: boolean;
  'data-testid'?: string;
}

export const CategorySelect = ({
  onChange,
  value = [],
  status,
  multiple,
  variant,
  showValue = false,
  'data-testid': dataTestId,
}: ICategorySelectProps) => {
  const [browsing, setBrowsing] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      <EntitySelect
        showValue={showValue}
        renderLabel={(it) => it.title}
        variant={variant}
        data-testid={dataTestId || 'category-select'}
        filterOption={false}
        placeholder={formatMessage({ id: t('category.select.placeholder') })}
        value={value}
        style={{ width: '100%' }}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
        onChange={onChange}
      />
      <BrowseCategories
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
        multiple={multiple}
      />
    </>
  );
};
