import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Label } from '@/components/forms/Label';
import { Flex } from '@/components/utility/Flex';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';

export const ProductPricing = () => {
  return (
    <Controller
      name="price"
      render={({ field: priceField, fieldState: priceFieldState }) => (
        <DrawerPaper>
          <DrawerPaperHeader
            title="Pricing"
            name="pricing"
          />
          <Flex gap="4">
            <Flex direction="column" grow="1">
              <Label>Price</Label>
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
                  <Label info="Original price shown with strikethrough">
                    Compare at price
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
                      <Label info="Used for profit calculations">
                        Cost price
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
