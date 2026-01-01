import { SerializedStyles } from '@emotion/react';
import { BrowseVariants } from '@modules/products/components/BrowseVariants';
import { IProductVariant } from '@src/entity/Product/Variant';
import { Button, ButtonProps } from 'antd';
import { useState } from 'react';

interface IBrowseVariantsButtonProps {
  onChange: (value: IProductVariant[]) => void;
  value: IProductVariant[];
  status?: 'error' | undefined;
  buttonProps?: ButtonProps & { css?: SerializedStyles };
  multiple?: boolean;
  inListing?: boolean;
}

export const BrowseVariantsButton = ({
  onChange,
  value = [],
  buttonProps,
  multiple,
  inListing,
}: IBrowseVariantsButtonProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <>
      <Button
        {...buttonProps}
        data-testid="browse-product-variants-button"
        onClick={() => {
          setBrowsing(true);
        }}
      >
        {buttonProps?.children}
      </Button>
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
