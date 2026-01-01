import { CurrencyInput } from '@components/forms/CurrencyInput';
import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';

export const ProductPricing = () => {
  const { formatMessage } = useIntl();
  return (
    <Controller
      name="price"
      render={({ field: priceField, fieldState: priceFieldState }) => (
        <DrawerPaper>
          <DrawerPaperHeader
            title={formatMessage({ id: t('product.pricing.title') })}
            name="pricing"
          />
          <Flex gap="4">
            <Flex direction="column" grow="1">
              <Label>
                {formatMessage({ id: t('product.pricing.price.label') })}
              </Label>
              <CurrencyInput
                data-testid="price-input"
                value={priceField.value}
                onChange={priceField.onChange}
                status={priceFieldState.invalid ? 'error' : undefined}
              />
            </Flex>
            <Controller
              name="oldPrice"
              render={({ field, fieldState }) => (
                <Flex direction="column" grow="1">
                  <Label
                    info={formatMessage({
                      id: t('product.pricing.compareAt.info'),
                    })}
                  >
                    {formatMessage({
                      id: t('product.pricing.compareAt.label'),
                    })}
                  </Label>
                  <CurrencyInput
                    data-testid="old-price-input"
                    value={field.value}
                    onChange={field.onChange}
                    status={fieldState.invalid ? 'error' : undefined}
                  />
                </Flex>
              )}
            />
          </Flex>
          <Flex wrap="wrap" gap="4" mt="4">
            <Controller
              name="costPrice"
              render={({ field, fieldState }) => {
                return (
                  <>
                    <Flex direction="column" grow="1">
                      <Label
                        info={formatMessage({
                          id: t('product.pricing.cost.info'),
                        })}
                      >
                        {formatMessage({ id: t('product.pricing.cost.label') })}
                      </Label>
                      <CurrencyInput
                        data-testid="cost-price-input"
                        value={field.value}
                        onChange={field.onChange}
                        status={fieldState.invalid ? 'error' : undefined}
                      />
                    </Flex>
                  </>
                );
              }}
            />
          </Flex>
        </DrawerPaper>
      )}
    />
  );
};
