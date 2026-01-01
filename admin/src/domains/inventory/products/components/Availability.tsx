import { Label } from '@/components/forms/Label';
import { StockStatusSelect } from '@/components/forms/StockStatusSelect';
import { Box } from '@/components/utility/Box';
import { Flex } from '@/components/utility/Flex';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';

export const ProductAvailability = () => {
  const renderFields = () => {
    return (
      <Controller
        key="stockStatus"
        name="stockStatus"
        render={({ field, fieldState }) => (
          <Box>
            <Label info="Current availability status of this product">
              Stock Status
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
        title="Availability"
        name="availability"
      />
      <Flex direction="column" gap="4">
        {renderFields()}
      </Flex>
    </DrawerPaper>
  );
};
