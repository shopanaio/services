import { EntitySelect } from '@components/forms/EntitySelect';
import { BrowseVariants } from '@modules/products/components/BrowseVariants';
import { IProductVariant } from '@src/entity/Product/Variant';
import { Variant } from 'antd/es/config-provider';
import { useState } from 'react';

interface IProductSelectProps {
  onChange: (value: IProductVariant[]) => void;
  value: IProductVariant[];
  browseType?: 'default' | 'compact' | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  multiple?: boolean;
  variant?: Variant;
  inListing?: boolean;
}

export const ProductSelect = ({
  onChange,
  value = [],
  status,
  showValue = false,
  multiple,
  variant,
  inListing,
}: IProductSelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <>
      <EntitySelect
        renderLabel={(it) => it.title}
        variant={variant}
        data-testid="product-select"
        filterOption={false}
        placeholder="Select product"
        showValue={showValue}
        value={value}
        style={{ width: '100%' }}
        onChange={onChange}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
      />
      <BrowseVariants
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
        multiple={multiple}
        inListing={inListing}
      />
    </>
  );
};
