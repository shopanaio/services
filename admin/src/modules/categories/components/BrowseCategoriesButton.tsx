import { BrowseCategories } from '@modules/categories/components/BrowseCategories';
import { IBrowseCategory } from '@src/entity/Category/BrowseCategory';
import { Button, ButtonProps } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface ICategorySelectProps {
  onChange: (value: IBrowseCategory[]) => void;
  value: IBrowseCategory[];
  status?: 'error' | undefined;
  buttonProps?: ButtonProps;
  trigger?: (props: { onClick: () => void }) => React.ReactNode;
}

export const BrowseCategoriesButton = ({
  onChange,
  value = [],
  buttonProps,
  trigger,
}: ICategorySelectProps) => {
  const [browsing, setBrowsing] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      {trigger ? (
        trigger({ onClick: () => setBrowsing(true) })
      ) : (
        <Button
          children={formatMessage({ id: t('category.browse.button') })}
          data-testid="browse-categories-button"
          {...buttonProps}
          onClick={() => {
            setBrowsing(true);
          }}
        />
      )}
      <BrowseCategories
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
      />
    </>
  );
};
