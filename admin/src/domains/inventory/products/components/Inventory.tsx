import { Label } from '@/components/forms/Label';
import { Flex } from '@/components/utility/Flex';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Input } from 'antd';
import { Controller } from 'react-hook-form';

export const ProductInventory = () => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Inventory"
        name="inventory"
      />
      <Flex direction="row" gap="4" wrap="wrap">
        <Controller
          name="sku"
          render={({ field, fieldState }) => (
            <Flex direction="column" grow="1">
              <Label info="Stock Keeping Unit - unique identifier for this product">
                SKU
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter SKU"
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
