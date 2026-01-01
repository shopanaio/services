import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Input } from 'antd';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';

export const ProductInventory = () => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('product.inventory.title') })}
        name="inventory"
      />
      <Flex direction="row" gap="4" wrap="wrap">
        <Controller
          name="sku"
          render={({ field, fieldState }) => (
            <Flex direction="column" grow="1">
              <Label
                info={formatMessage({ id: t('product.inventory.sku.info') })}
              >
                {formatMessage({ id: t('product.inventory.sku.label') })}
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder={formatMessage({
                  id: t('product.inventory.sku.placeholder'),
                })}
                status={fieldState.invalid ? 'error' : undefined}
                data-testid="sku-input"
              />
            </Flex>
          )}
        />
      </Flex>
    </DrawerPaper>
  );
};
