import { css } from '@emotion/react';
import { ProductAvailability } from '@modules/products/components/Availability';
import { ProductInventory } from '@modules/products/components/Inventory';
import { ProductMedia } from '@modules/products/components/Media';
import { ProductPricing } from '@modules/products/components/Pricing';
import { ProductShipping } from '@modules/products/components/Shipping';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

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
  const { formatMessage } = useIntl();
  return (
    <>
      <DrawerPaper>
        <DrawerPaperHeader
          title={formatMessage({ id: t('product.media.title') })}
          name="media"
        />
        <Typography.Text type="secondary">
          {formatMessage({ id: t('product.variant.disabled.media.note') })}
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
            title={formatMessage({ id: t('product.pricing.title') })}
            name="pricing"
          />
          <Typography.Text type="secondary">
            {formatMessage({ id: t('product.variant.disabled.pricing.note') })}
          </Typography.Text>
        </DrawerPaper>
        <DrawerPaper>
          <DrawerPaperHeader
            title={formatMessage({ id: t('product.parameters.title') })}
            name="shipping"
          />
          <Typography.Text type="secondary">
            {formatMessage({
              id: t('product.variant.disabled.parameters.note'),
            })}
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
            title={formatMessage({ id: t('product.inventory.title') })}
            name="inventory"
          />
          <Typography.Text type="secondary">
            {formatMessage({
              id: t('product.variant.disabled.inventory.note'),
            })}
          </Typography.Text>
        </DrawerPaper>
        <DrawerPaper>
          <DrawerPaperHeader
            title={formatMessage({ id: t('product.availability.title') })}
            name="availability"
          />
          <Typography.Text type="secondary">
            {formatMessage({
              id: t('product.variant.disabled.availability.note'),
            })}
          </Typography.Text>
        </DrawerPaper>
      </div>
    </>
  );
};
