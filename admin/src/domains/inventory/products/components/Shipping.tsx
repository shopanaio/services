import { Label } from '@/components/forms/Label';
import { WeightInput } from '@/components/forms/WeightInput';
import { Box } from '@/components/utility/Box';
import { Flex } from '@/components/utility/Flex';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Button, Dropdown, Space } from 'antd';
import { Controller } from 'react-hook-form';
import { NumberInput } from '@/components/forms/NumberInput';
import { dimensionUnitOptions } from '@/defs/constants';
import { DimensionUnit } from '@/domains/inventory/products/types';

export const ProductShipping = () => {
  const renderFields = () => {
    return (
      <>
        <Controller
          name="weightUnit"
          render={({ field: unit }) => (
            <Controller
              name="weight"
              render={({ field, fieldState }) => (
                <Box>
                  <Label>Weight</Label>
                  <WeightInput
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    unit={unit.value}
                    onChangeUnit={unit.onChange}
                  />
                </Box>
              )}
            />
          )}
        />

        {/* Dimensions */}
        <Box>
          <Label>Dimensions (L × W × H)</Label>
          <Space.Compact>
            <Controller
              name="length"
              render={({ field: lengthField, fieldState }) => (
                <NumberInput
                  value={lengthField.value}
                  onChange={lengthField.onChange}
                  status={fieldState.invalid ? 'error' : undefined}
                  decimalScale={3}
                  width="80px"
                />
              )}
            />
            <Controller
              name="width"
              render={({ field: widthField, fieldState }) => (
                <NumberInput
                  value={widthField.value}
                  onChange={widthField.onChange}
                  status={fieldState.invalid ? 'error' : undefined}
                  decimalScale={3}
                  width="80px"
                />
              )}
            />
            <Controller
              name="height"
              render={({ field: heightField, fieldState }) => (
                <NumberInput
                  value={heightField.value}
                  onChange={heightField.onChange}
                  status={fieldState.invalid ? 'error' : undefined}
                  decimalScale={3}
                  width="80px"
                />
              )}
            />
            <Controller
              name="dimensionUnit"
              render={({ field: dimUnit }) => (
                <Dropdown
                  menu={{
                    items: Object.values(dimensionUnitOptions),
                    selectedKeys: [String(dimUnit.value)],
                    onClick: ({ key }) => dimUnit.onChange(key),
                  }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button>
                    {dimensionUnitOptions[dimUnit.value as DimensionUnit]
                      ?.label || '-'}
                  </Button>
                </Dropdown>
              )}
            />
          </Space.Compact>
        </Box>
      </>
    );
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Shipping"
        name="shipping"
      />
      <Flex direction="column" gap="4">
        {renderFields()}
      </Flex>
    </DrawerPaper>
  );
};
