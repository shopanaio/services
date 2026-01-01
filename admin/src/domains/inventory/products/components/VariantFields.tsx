import { css } from '@emotion/react';
import { ProductAvailability } from '@/domains/inventory/products/components/Availability';
import { ProductInventory } from '@/domains/inventory/products/components/Inventory';
import { ProductMedia } from '@/domains/inventory/products/components/Media';
import { ProductPricing } from '@/domains/inventory/products/components/Pricing';
import { ProductShipping } from '@/domains/inventory/products/components/Shipping';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';

export const VariantFields = () => {
  return (
    <>
      <ProductMedia key="media" />
      <div
        css={css`
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--x4);
        `}
      >
        <ProductPricing key="pricing" />
        <ProductShipping key="shipping" />
      </div>
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--x4);
        `}
      >
        <ProductInventory key="inventory" />
        <ProductAvailability key="availability" />
      </div>
    </>
  );
};

export const DisabledVariantFields = () => {
  return (
    <>
      <DrawerPaper>
        <DrawerPaperHeader
          title="Media"
          name="media"
        />
        <Typography.Text type="secondary">
          Media is managed at the variant level for products with options.
        </Typography.Text>
      </DrawerPaper>
      <div
        css={css`
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--x4);
        `}
      >
        <DrawerPaper>
          <DrawerPaperHeader
            title="Pricing"
            name="pricing"
          />
          <Typography.Text type="secondary">
            Pricing is managed at the variant level for products with options.
          </Typography.Text>
        </DrawerPaper>
        <DrawerPaper>
          <DrawerPaperHeader
            title="Shipping"
            name="shipping"
          />
          <Typography.Text type="secondary">
            Shipping is managed at the variant level for products with options.
          </Typography.Text>
        </DrawerPaper>
      </div>
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--x4);
        `}
      >
        <DrawerPaper>
          <DrawerPaperHeader
            title="Inventory"
            name="inventory"
          />
          <Typography.Text type="secondary">
            Inventory is managed at the variant level for products with options.
          </Typography.Text>
        </DrawerPaper>
        <DrawerPaper>
          <DrawerPaperHeader
            title="Availability"
            name="availability"
          />
          <Typography.Text type="secondary">
            Availability is managed at the variant level for products with options.
          </Typography.Text>
        </DrawerPaper>
      </div>
    </>
  );
};
