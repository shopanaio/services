import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { StockStatusSelect } from '@modules/stockStatuses/components/StockStatusSelect';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';

export const ProductAvailability = () => {
  const { formatMessage } = useIntl();
  const renderFields = () => {
    return (
      <Controller
        key="stockStatus"
        name="stockStatus"
        render={({ field, fieldState }) => (
          <Box>
            <Label
              info={formatMessage({
                id: t('product.availability.stockStatus.info'),
              })}
            >
              {formatMessage({
                id: t('product.availability.stockStatus.label'),
              })}
            </Label>
            <StockStatusSelect
              value={field.value}
              onChange={field.onChange}
              status={fieldState.invalid ? 'error' : undefined}
            />
          </Box>
        )}
      />
    );
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('product.availability.title') })}
        name="availability"
      />
      <Flex direction="column" gap="4">
        {renderFields()}
      </Flex>
    </DrawerPaper>
  );
};
