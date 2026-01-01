import { Flex } from '@components/utility/Flex';
import { IProductFormVariantValues } from '@modules/products/types';
import { IProductFeatureGroup } from '@src/entity/Product/ProductFeature';
import { ISelectedRowsProps } from '@src/layouts/table/hooks/useSelectedRows';
import { Button, Checkbox, Dropdown, Typography } from 'antd';
import { groupBy, partition, uniqBy } from 'lodash';
import { HiChevronDown } from 'react-icons/hi';
import { useIntl } from 'react-intl';

interface ITableControlsProps {
  variants: IProductFormVariantValues[];
  selectedRowsProps: ISelectedRowsProps<any>;
}

export const TableControls = ({
  selectedRowsProps,
  variants,
}: ITableControlsProps) => {
  const intl = useIntl();
  const { selectedRows, clearSelectedRows, onChangeSelectedRows } =
    selectedRowsProps;

  const groups: Record<string, IProductFeatureGroup> = {};
  variants.forEach((it) => {
    it.options.forEach((option) => {
      groups[option.group.slug] = option.group;
    });
  });

  const options = Object.entries(
    groupBy(
      uniqBy(variants.flatMap((it) => it.options) || [], 'slug'),
      'group.slug',
    ),
  );

  return (
    <Flex align="center">
      {!!selectedRows?.length && (
        <Dropdown menu={{ items: [] }} trigger={['click']}>
          <Button
            type="text"
            style={{ paddingRight: 'var(--x3)' }}
            data-testid="variant-actions-button"
          >
            <Flex gap="1" align="center">
              <Typography.Text strong>
                {intl.formatMessage(
                  {
                    id: 'layouts.actions.selected',
                  },
                  { count: selectedRows.length },
                )}
              </Typography.Text>
              <HiChevronDown size={16} />
            </Flex>
          </Button>
        </Dropdown>
      )}
      <Flex gap="1" align="center">
        {!selectedRows?.length && (
          <Button
            type="text"
            onClick={() => onChangeSelectedRows(variants)}
            data-testid="select-all-variants"
          >
            {intl.formatMessage(
              {
                id: 'products.variants.selectAll',
              },
              { count: variants.length },
            )}
          </Button>
        )}
        <Button type="text" onClick={clearSelectedRows}>
          {intl.formatMessage({
            id: 'products.variants.clearSelection',
          })}
        </Button>
        {(options || []).map(([groupSlug, optionValues], idx: number) => {
          const items = optionValues.map((optionValue) => {
            const { title, id } = optionValue;
            const currentVariants = variants.filter(
              (v) => v.options.findIndex((f: any) => f.id === id) !== -1,
            );

            const [currentSelectedVariants, otherSelectedVariants] = partition(
              selectedRows,
              (v) => v.options.findIndex((f: any) => f.id === id) !== -1,
            );

            const isChecked = currentSelectedVariants.length > 0;
            const indeterminate =
              isChecked &&
              currentSelectedVariants.length < currentVariants.length;

            const onClick = () => {
              if (isChecked) {
                onChangeSelectedRows(otherSelectedVariants);
                return;
              }

              onChangeSelectedRows([
                ...otherSelectedVariants,
                ...currentVariants,
              ]);
            };

            return {
              label: (
                <Flex gap="2" minW="100px">
                  <Checkbox checked={isChecked} indeterminate={indeterminate} />
                  <Typography.Text>{title || ''}</Typography.Text>
                </Flex>
              ),
              key: id,
              onClick,
            };
          });

          return (
            <Dropdown trigger={['click']} menu={{ items }} key={idx}>
              <Button type="text" style={{ paddingRight: 'var(--x3)' }}>
                <Flex align="center" gap="1">
                  {groups[groupSlug]?.title || ''}
                  <HiChevronDown size={16} />
                </Flex>
              </Button>
            </Dropdown>
          );
        })}
      </Flex>
    </Flex>
  );
};
