import { Label } from '@components/forms/Label';
import { WeightInput } from '@components/forms/WeightInput';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Dropdown, Space } from 'antd';
import { Controller } from 'react-hook-form';
import { NumberInput } from '@components/forms/NumberInput';
import { dimensionUnitOptions } from '@src/defs/constants';
import { DimensionUnit } from '@src/graphql';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const ProductShipping = () => {
  const { formatMessage } = useIntl();

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
                  <Label>
                    {formatMessage({ id: t('products.filters.weight.label') })}
                  </Label>
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
          <Label>
            {formatMessage({ id: t('products.filters.dimensions.label') })}
          </Label>
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
        title={formatMessage({ id: t('product.parameters.title') })}
        name="shipping"
      />
      <Flex direction="column" gap="4">
        {renderFields()}
      </Flex>
    </DrawerPaper>
  );
};
