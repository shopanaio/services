/* eslint-disable jsx-a11y/no-autofocus */
import { Label } from '@components/forms/Label';
import { Paper } from '@components/paper/Paper';
import { dragIndicatorColumn, getNameColumn } from '@components/table/columns';
import { DraggableTable } from '@components/table/DraggableTable';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useIntl } from 'react-intl';

import { BrowseVariantsButton } from '@modules/products/components/BrowseVariantsButton';
import { IProductGroupFormValues } from '@modules/products/components/groups/schema';
import { IProductGroupItem } from '@src/entity/ProductGroup/ProductGroupItem';
import { syntheticId } from '@src/utils/synthetic-id';
import { filterById } from '@src/utils/utils';
import { Button, Input, Switch, Select } from 'antd';
import { ProductGroupPriceType } from '@src/graphql';
import { NumericFormat } from 'react-number-format';
import { Control, Controller } from 'react-hook-form';
import { MdClose } from 'react-icons/md';
import { CurrencyInput } from '@components/forms/CurrencyInput';
import { AntdInput } from '@components/forms/NumberInput';

interface IProductGroupFormProps {
  control: Control<IProductGroupFormValues>;
  setItems: (value: IProductGroupItem[]) => void;
  items: IProductGroupItem[];
}

export const ProductGroupForm = ({
  control,
  setItems,
  items,
}: IProductGroupFormProps) => {
  const intl = useIntl();
  return (
    <Flex align="center" w="100%" direction="column">
      <Flex w="100%" direction="column">
        <Label required>
          {intl.formatMessage({
            id: 'common.title',
          })}
        </Label>
        <Flex w="100%" gap="4">
          <Controller
            control={control}
            name="title"
            render={({ field: { name, value, onChange } }) => (
              <Input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={intl.formatMessage({
                  id: 'products.groups.title.placeholder',
                })}
                data-testid="product-group-title-input"
              />
            )}
          />
          <BrowseVariantsButton
            buttonProps={{
              children: intl.formatMessage({
                id: 'products.groups.selectProducts',
              }),
            }}
            multiple
            value={items.map((it) => it.product)}
            inListing={false}
            onChange={(value) => {
              setItems([
                ...items,
                ...value.map((it) => ({
                  product: it,
                  id: syntheticId(),
                  priceType: ProductGroupPriceType.Base,
                  priceAmountValue: null,
                  pricePercentageValue: null,
                })),
              ]);
            }}
          />
        </Flex>
      </Flex>
      <Box
        w="100%"
        mt="4"
        css={css`
          position: relative;
        `}
      >
        <Label required>
          {intl.formatMessage({
            id: 'products.groups.productsLabel',
          })}
        </Label>
        <Paper>
          <DraggableTable
            locale={{
              emptyText: intl.formatMessage({
                id: 'products.groups.noProductsAdded',
              }),
            }}
            pagination={false}
            showHeader={false}
            setDataSource={setItems}
            dataSource={items}
            // @ts-expect-error
            onRow={(_, idx) => ({
              'data-testid': `group-row-${idx}`,
            })}
            columns={[
              dragIndicatorColumn,
              {
                ...getNameColumn({
                  optionsPath: 'options',
                  titlePath: 'product.title',
                  coverPath: 'product.cover',
                }),
              },
              {
                dataIndex: 'priceType',
                key: 'priceType',
                width: 180,
                render: (_v, record) => (
                  <Select
                    value={record.priceType ?? ProductGroupPriceType.Base}
                    onChange={(value) => {
                      setItems(
                        items.map((it) =>
                          it.id === record.id
                            ? {
                                ...it,
                                priceType: value as ProductGroupPriceType,
                                // reset values when price type changes
                                priceAmountValue: null,
                                pricePercentageValue: null,
                              }
                            : it,
                        ),
                      );
                    }}
                    options={[
                      {
                        value: ProductGroupPriceType.Base,
                        label: intl.formatMessage({
                          id: 'products.groups.priceType.base',
                        }),
                      },
                      {
                        value: ProductGroupPriceType.BaseAdjustAmount,
                        label: intl.formatMessage({
                          id: 'products.groups.priceType.discountAmount',
                        }),
                      },
                      {
                        value: ProductGroupPriceType.BaseAdjustPercent,
                        label: intl.formatMessage({
                          id: 'products.groups.priceType.discountPercent',
                        }),
                      },
                      {
                        value: ProductGroupPriceType.Free,
                        label: intl.formatMessage({
                          id: 'products.groups.priceType.free',
                        }),
                      },
                    ]}
                    style={{ width: '100%' }}
                  />
                ),
              },
              {
                dataIndex: 'priceValue',
                key: 'priceValue',
                width: 140,
                render: (_v, record) => {
                  switch (record.priceType) {
                    case ProductGroupPriceType.BaseAdjustAmount:
                      return (
                        <CurrencyInput
                          data-testid="price-input"
                          value={record.priceAmountValue ?? 0}
                          isNegative
                          onChange={(value) => {
                            setItems(
                              items.map((it) =>
                                it.id === record.id
                                  ? {
                                      ...it,
                                      priceAmountValue: value as number,
                                    }
                                  : it,
                              ),
                            );
                          }}
                        />
                      );
                    case ProductGroupPriceType.BaseAdjustPercent:
                      return (
                        <NumericFormat
                          value={record.pricePercentageValue ?? 0}
                          customInput={AntdInput}
                          allowNegative={false}
                          data-antd-prefix="—"
                          decimalScale={2}
                          data-antd-suffix="%"
                          isAllowed={({ floatValue }) => {
                            return floatValue! <= 100;
                          }}
                          onValueChange={({ floatValue }) => {
                            setItems(
                              items.map((it) =>
                                it.id === record.id
                                  ? {
                                      ...it,
                                      pricePercentageValue: floatValue,
                                    }
                                  : it,
                              ),
                            );
                          }}
                        />
                      );
                    default:
                      return null;
                  }
                },
              },
              {
                dataIndex: 'actions',
                key: 'actions',
                width: 40,
                render: (_v, record) =>
                  record.isOption ? null : (
                    <Button
                      type="text"
                      icon={<MdClose />}
                      onClick={() => {
                        setItems(items.filter(filterById(record.id)));
                      }}
                      data-testid="delete-group-item-button"
                    />
                  ),
              },
            ]}
          />
        </Paper>
        <Flex align="center" gap="6" py="3">
          <Controller
            control={control}
            name="isRequired"
            render={({ field: { value, onChange } }) => (
              <Label
                control={
                  <Switch
                    size="small"
                    checked={value}
                    onChange={onChange}
                    data-testid="required-toggle"
                  />
                }
              >
                {intl.formatMessage({
                  id: 'products.groups.required',
                })}
              </Label>
            )}
          />
          <Controller
            control={control}
            name="isMultiple"
            render={({ field: { value, onChange } }) => (
              <Label
                control={
                  <Switch
                    size="small"
                    checked={value}
                    onChange={onChange}
                    data-testid="multiple-selection-toggle"
                  />
                }
              >
                {intl.formatMessage({
                  id: 'products.groups.multipleSelection',
                })}
              </Label>
            )}
          />
        </Flex>
      </Box>
    </Flex>
  );
};
