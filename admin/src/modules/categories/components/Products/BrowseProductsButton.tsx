import { BrowseCategoriesProducts } from '@modules/categories/components/Products/BrowseProducts';
import { IProduct } from '@src/entity/Product/Product';
import { Button } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IProductSelectProps {
  onChange: (value: IProduct[]) => void;
  value: IProduct[];
}

export const BrowseCategoriesProductsButton = ({
  onChange,
  value = [],
}: IProductSelectProps) => {
  const [browsing, setBrowsing] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      <Button
        type="primary"
        onClick={() => {
          setBrowsing(true);
        }}
      >
        {formatMessage({ id: t('category.products.addButton') })}
      </Button>
      <BrowseCategoriesProducts
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
      />
    </>
  );
};
