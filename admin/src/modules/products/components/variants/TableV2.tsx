import { css } from '@emotion/react';
import { TableImage } from '@components/table/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { Flex } from '@components/utility/Flex';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { Modal, Space, Switch, Tag, Typography } from 'antd';
import { CurrencyInput } from '@components/forms/CurrencyInput';
import { cropString, getExpandRowButton } from '@src/utils/utils';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { IProductVariant } from '@src/entity/Product/Variant';
import { StockStatusSelect } from '@modules/stockStatuses/components/StockStatusSelect';
import { Paper } from '@components/paper/Paper';
import { IProductFormVariantValues } from '@modules/products/types';
import { uniqBy } from 'lodash';
import { IProductFeature } from '@src/entity/Product/ProductFeature';
import { subtextCss } from '@components/table/columns';
import { MiddleArrow } from '@modules/products/components/variants/Arrows';
import { Box } from '@components/utility/Box';
import {
  BorderlessInput,
  BorderlessSelect,
} from '@components/forms/BorderlessInput';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { TableControls } from '@modules/products/components/variants/TableControls';
import { useSelectedRows } from '@src/layouts/table/hooks/useSelectedRows';
import { DataTable } from '@src/layouts/table/components/Table';
import { Gallery } from '@components/forms/media/Gallery';
import {
  AutoWidthNumberInput,
  NumberInput,
} from '@components/forms/NumberInput';
import { dimensionUnitOptions, weightUniOptions } from '@src/defs/constants';
import { DimensionUnit, WeightUnit } from '@src/graphql';

const tagCss = css`
  margin-right: var(--x1);
`;

const expandColumn = {
  align: 'center' as const,
  fixed: 'left' as const,
  key: 'expand',
  title: '',
  width: 40,
  render: () => null,
  onCell: () => ({
    style: {
      padding: 0,
    },
  }),
};

const getOption = (it: Partial<IProductFormVariantValues>) =>
  it.options?.[0] as IProductFeature;

export const ProductVariantsTable = ({
  refetch: _refetch,
}: {
  refetch: (id: ID) => void;
}) => {
  const intl = useIntl();
  const { watch, setValue, getValues } = useFormContext();
  const selectedRowsProps = useSelectedRows<IProductVariant>({
    initialRows: [],
    // onChangeSelectedRows: ,
  });
  const { selectedRows, onChangeSelectedRows } = selectedRowsProps;

  const variants: Partial<IProductFormVariantValues>[] = watch('variants');

  // State for quick gallery edit
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(
    null,
  );
  const galleryForm = useForm<{ gallery: IMediaFile[] }>({
    defaultValues: { gallery: [] },
    reValidateMode: 'onBlur',
  });
  const openGalleryModal = (index: number) => {
    setActiveGalleryIndex(index);
    setIsGalleryOpen(true);
  };
  const closeGalleryModal = () => {
    setIsGalleryOpen(false);
    setActiveGalleryIndex(null);
  };
  useEffect(() => {
    if (!isGalleryOpen || activeGalleryIndex === null) {
      return;
    }
    const current = variants[activeGalleryIndex];
    galleryForm.reset({ gallery: (current?.gallery as IMediaFile[]) || [] });
  }, [isGalleryOpen, activeGalleryIndex, variants, galleryForm]);

  const setVariants = useCallback(
    (nextVariants: Partial<IProductVariant>[]) => {
      setValue('variants', nextVariants, { shouldDirty: true });
    },
    [setValue],
  );

  const updateVariants = (
    updater: (
      variant: Partial<IProductFormVariantValues>,
    ) => Partial<IProductFormVariantValues>,
    idx: number,
  ) => {
    const variant = variants[idx];
    if (!variant?.id) {
      return;
    }

    if (
      selectedRows.length &&
      selectedRows.some((it) => it.id === variant.id)
    ) {
      const record = selectedRows.reduce(
        (acc, it) => ({ ...acc, [it.id]: true }),
        {} as Record<ID, boolean>,
      );
      setVariants(variants.map((it) => (record[it.id!] ? updater(it) : it)));
    } else {
      const nextVariants = [...variants];
      nextVariants[idx] = updater(nextVariants[idx]);
      setVariants(nextVariants);
    }
  };

  const onOpenVariation = ({ index }: { index: number }) => {
    const variant = variants[index];

    if (!variant) {
      console.error('No variation found');
      return;
    }

    $drawers.addDrawer({
      entityId: variant.id,
      type: DrawerTypes.PRODUCT_VARIANT,
      meta: {
        formValues: getValues(),
        onSubmit: refetch,
      },
    });
  };

  const [compactVariants, isCompact] = useMemo(() => {
    if (!variants.length) {
      return [[], false];
    }

    const withIndex = variants.map((record, idx) => ({
      ...record,
      index: idx,
    }));

    if (1 || variants[0].options?.length === 1) {
      return [withIndex, false];
    }

    const groups = uniqBy(variants.map(getOption), 'id') // todo: use slug
      .filter(Boolean)
      .map((it) => ({
        ...it,
        isRoot: true,
        variants: withIndex
          .filter((variant) => variant.options?.[0]?.id === it.id)
          .map((it, idx, { length }) => ({
            ...it,
            isLastSubVariant: idx === length - 1,
          })),
      }));
    return [groups, true];
  }, [variants]);

  if (!variants?.length) {
    return null;
  }

  return (
    <Flex direction="column" gap="2">
      <TableControls
        variants={compactVariants as unknown as IProductFormVariantValues[]}
        selectedRowsProps={selectedRowsProps}
      />
      <Paper>
        <DataTable
          selectedRows={selectedRows}
          onChangeSelectedRows={onChangeSelectedRows}
          data={compactVariants}
          name="variants"
          pagination={false}
          rowKey="id"
          columns={[
            ...(isCompact ? [expandColumn] : []),
            {
              fixed: 'left' as const,
              title: intl.formatMessage({ id: 'products.variant' }),
              dataIndex: 'cover',
              key: 'cover',
              onCell: (record) => ({
                onClick: (e) => {
                  if (record.isRoot) {
                    const expandButton = getExpandRowButton(
                      e.currentTarget.closest('tr'),
                    );

                    if (expandButton) {
                      expandButton.click();
                    }

                    return;
                  }
                },
              }),
              render: (_: any, record: any, idx: number) => {
                const {
                  variants: children,
                  isRoot,
                  isLastSubVariant,
                  index,
                } = record;

                if (isRoot) {
                  const newVariants = children.filter((it: any) => it._isNew);

                  return (
                    // @deprecated branch
                    <Flex gap="3" h="40px" align="center">
                      <TableImage
                        file={children[0]?.cover}
                        name="variant"
                        size={36}
                      />
                      <Flex direction="column" justify="center">
                        <Box pr="2">
                          <Typography.Text
                            data-testid={`root-title-${index}`}
                            ellipsis
                          >
                            {record.title}
                          </Typography.Text>
                        </Box>
                        <Flex gap="4">
                          <Typography.Text type="secondary" css={subtextCss}>
                            {intl.formatMessage(
                              { id: 'product.variantsCount' },
                              { count: children.length },
                            )}
                          </Typography.Text>
                        </Flex>
                      </Flex>
                      <Flex>
                        {!!newVariants.length && (
                          <Tag color="blue" css={tagCss}>
                            +{newVariants.length}
                          </Tag>
                        )}
                      </Flex>
                    </Flex>
                  );
                }

                const optionsString = (record.options || [])
                  .slice(isCompact ? 1 : 0)
                  .map((it: any) => cropString(it?.title, 10))
                  .join(' ▸ ');

                return (
                  <Flex gap="2" align="center" h="40px">
                    {isCompact && <MiddleArrow isFinal={isLastSubVariant} />}
                    <Box
                      css={css`
                        cursor: pointer;
                      `}
                    >
                      <TableImage
                        file={record.gallery[0]}
                        size={40}
                        name="variant"
                        onClick={() => {
                          openGalleryModal(record.index!);
                        }}
                      />
                    </Box>
                    <Flex direction="column" justify="center" w="100%">
                      <BorderlessInput
                        value={record.title}
                        onChange={({ target }) => {
                          updateVariants(
                            (it) => ({ ...it, title: target.value }),
                            idx,
                          );
                        }}
                        placeholder={intl.formatMessage({
                          id: 'products.variant.title',
                        })}
                        data-testid={`sku-input-${idx}`}
                        style={{
                          width: '100%',
                          maxWidth: 300,
                        }}
                      />
                      <Typography.Text
                        ellipsis
                        type="secondary"
                        css={css`
                          font-size: 12px;
                          margin-top: -6px;
                          pointer-events: none;
                        `}
                      >
                        {optionsString}
                      </Typography.Text>
                    </Flex>
                  </Flex>
                );
              },
            },
            {
              title: intl.formatMessage({
                id: 'product.availability.stockStatus.label',
              }),
              render: (_: any, record: any, idx: number) => (
                <StockStatusSelect
                  variant="borderless"
                  value={record.stockStatus}
                  onChange={(status) => {
                    updateVariants(
                      (it) => ({ ...it, stockStatus: status as string }),
                      idx,
                    );
                  }}
                  data-testid={`stock-status-select-${idx}`}
                  suffixIcon={null}
                  dropdownStyle={{ width: 150 }}
                  style={{
                    width: '100%',
                    maxWidth: 100,
                  }}
                />
              ),
              dataIndex: 'stockStatus',
              key: 'stockStatus',
              width: 140,
            },
            {
              title: intl.formatMessage({ id: 'products.filters.sku.label' }),
              render: (_: any, record: any, idx: number) => (
                <BorderlessInput
                  value={record.sku}
                  onChange={({ target }) => {
                    updateVariants((it) => ({ ...it, sku: target.value }), idx);
                  }}
                  placeholder={intl.formatMessage({
                    id: 'products.filters.sku.label',
                  })}
                  data-testid={`sku-input-${idx}`}
                  style={{
                    width: '100%',
                    maxWidth: 140,
                  }}
                />
              ),
              dataIndex: 'sku',
              key: 'sku',
              width: 150,
            },
            {
              title: intl.formatMessage({ id: 'common.price' }),
              render: (_: any, record: any, idx: number) => (
                <CurrencyInput
                  variant="borderless"
                  data-testid={`price-input-${idx}`}
                  value={record.price}
                  onChange={(value) => {
                    updateVariants(
                      (it) => ({ ...it, price: value as number }),
                      idx,
                    );
                  }}
                  style={{ maxWidth: 120 }}
                />
              ),
              dataIndex: 'price',
              key: 'price',
              width: 140,
            },
            {
              title: intl.formatMessage({ id: 'common.oldPrice' }),
              render: (_: any, record: any, idx: number) => (
                <CurrencyInput
                  variant="borderless"
                  value={record.oldPrice}
                  onChange={(value) => {
                    updateVariants(
                      (it) => ({ ...it, oldPrice: value as number }),
                      idx,
                    );
                  }}
                  data-testid={`old-price-input-${idx}`}
                  style={{ maxWidth: 120 }}
                />
              ),
              dataIndex: 'oldPrice',
              key: 'oldPrice',
              width: 140,
            },
            {
              title: intl.formatMessage({ id: 'common.costPrice' }),
              render: (_: any, record: any, idx: number) => (
                <CurrencyInput
                  variant="borderless"
                  value={record.costPrice}
                  onChange={(value) => {
                    updateVariants(
                      (it) => ({ ...it, costPrice: value as number }),
                      idx,
                    );
                  }}
                  data-testid={`cost-price-input-${idx}`}
                  style={{ maxWidth: 120 }}
                />
              ),
              dataIndex: 'oldPrice',
              key: 'oldPrice',
              width: 140,
            },
            {
              dataIndex: 'weight',
              key: 'weight',
              width: 140,
              title: intl.formatMessage({
                id: 'products.filters.weight.label',
              }),
              render: (_: any, record: any, idx: number) => (
                <Flex align="center">
                  <AutoWidthNumberInput
                    variant="borderless"
                    width="40px"
                    styles={{ input: { paddingInline: 0 } }}
                    decimalScale={3}
                    data-testid="weight-input"
                    value={record.weight}
                    onChange={(value) => {
                      updateVariants(
                        (it) => ({ ...it, weight: value as number }),
                        idx,
                      );
                    }}
                  />
                  <BorderlessSelect
                    options={Object.values(weightUniOptions).map((it) => ({
                      label: it.label,
                      value: it.key,
                    }))}
                    suffixIcon={null}
                    value={record.weightUnit}
                    onChange={(value) => {
                      updateVariants(
                        (it) => ({ ...it, weightUnit: value as WeightUnit }),
                        idx,
                      );
                    }}
                    style={{ width: 24 }}
                    dropdownStyle={{ width: 60 }}
                  />
                </Flex>
              ),
            },
            {
              title: intl.formatMessage({
                id: 'products.filters.dimensions.label',
              }),
              key: 'dimensions',
              width: 200,
              render: (_: any, record: any, idx: number) => (
                <Flex align="center">
                  <AutoWidthNumberInput
                    variant="borderless"
                    value={record.length}
                    decimalScale={3}
                    placeholder="0"
                    styles={{ input: { paddingInline: 0 } }}
                    onChange={(value) => {
                      updateVariants(
                        (it) => ({ ...it, length: value as number }),
                        idx,
                      );
                    }}
                  />
                  <Typography.Text
                    type="secondary"
                    css={css`
                      padding-right: 4px;
                    `}
                  >
                    x
                  </Typography.Text>
                  <AutoWidthNumberInput
                    variant="borderless"
                    value={record.width}
                    decimalScale={3}
                    placeholder="0"
                    styles={{ input: { paddingInline: 0 } }}
                    onChange={(value) => {
                      updateVariants(
                        (it) => ({ ...it, width: value as number }),
                        idx,
                      );
                    }}
                  />
                  <Typography.Text
                    type="secondary"
                    css={css`
                      padding-right: 4px;
                    `}
                  >
                    x
                  </Typography.Text>
                  <AutoWidthNumberInput
                    variant="borderless"
                    value={record.height}
                    decimalScale={3}
                    placeholder="0"
                    styles={{ input: { paddingInline: 0 } }}
                    onChange={(value) => {
                      updateVariants(
                        (it) => ({ ...it, height: value as number }),
                        idx,
                      );
                    }}
                  />
                  <BorderlessSelect
                    options={Object.values(dimensionUnitOptions).map((it) => ({
                      label: it.label,
                      value: it.key,
                    }))}
                    suffixIcon={null}
                    style={{ width: 40 }}
                    value={record.dimensionUnit}
                    dropdownStyle={{ width: 60 }}
                    onChange={(value) => {
                      updateVariants(
                        (it) => ({
                          ...it,
                          dimensionUnit: value as DimensionUnit,
                        }),
                        idx,
                      );
                    }}
                  />
                </Flex>
              ),
              dataIndex: 'dimensionUnit',
            },
            {
              title: intl.formatMessage({ id: 'products.variants.inListing' }),
              key: 'inListing',
              ellipsis: true,
              align: 'right',
              width: 80,
              fixed: 'right' as const,
              render: (_: any, record: any, idx) => {
                return (
                  <Switch
                    disabled={idx === 0}
                    size="small"
                    onChange={(checked) => {
                      updateVariants(
                        (it) => ({ ...it, inListing: checked }),
                        idx,
                      );
                    }}
                    data-testid={`in-listing-switch-${idx}`}
                    checked={idx === 0 || record.inListing}
                    css={css`
                      margin-left: auto;
                    `}
                  />
                );
              },
            },
          ]}
        />
      </Paper>
      <Modal
        title={intl.formatMessage({ id: 'common.gallery' })}
        open={isGalleryOpen}
        width={1200}
        centered
        onCancel={closeGalleryModal}
        onOk={() => {
          const values = galleryForm.getValues();
          const nextGallery = values.gallery as IMediaFile[];

          if (selectedRows.length) {
            const selectedMap = selectedRows.reduce(
              (acc, it) => ({ ...acc, [it.id]: true }),
              {} as Record<ID, boolean>,
            );
            setVariants(
              variants.map((variant) =>
                variant.id && selectedMap[variant.id]
                  ? { ...variant, gallery: nextGallery }
                  : variant,
              ),
            );
          } else if (activeGalleryIndex !== null) {
            updateVariants(
              (it) => ({ ...it, gallery: nextGallery }),
              activeGalleryIndex,
            );
          }

          closeGalleryModal();
        }}
        destroyOnClose
        afterOpenChange={(open) => {
          if (!open) {
            closeGalleryModal();
          }
        }}
      >
        <FormProvider {...galleryForm}>
          <Gallery />
        </FormProvider>
      </Modal>
    </Flex>
  );
};
