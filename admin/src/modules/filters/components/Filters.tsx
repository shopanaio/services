import { iconProps } from '@components/styles';
import { DraggableTable } from '@components/table/DraggableTable';
import { dragIndicatorColumn, getNameColumn } from '@components/table/columns';
import { Flex } from '@components/utility/Flex';
import { FilterModal } from '@modules/navigation/components/FilterModal';
import { IFeatureGroup } from '@src/entity/Feature/FeatureGroup';
import { IProductFilter } from '@src/entity/ProductFilter/ProductFilter';
import { productFilters } from '@src/entity/ProductFilter/defs';
import { FilterType } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Dropdown, Skeleton } from 'antd';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { MdClose, MdEdit } from 'react-icons/md';

export type IFilterFormValue = Pick<
  IProductFilter,
  'sortIndex' | 'type' | 'title' | 'controlType'
> & {
  id: number | null;
  featureGroup?: IFeatureGroup;
};
interface INavFiltersProps {
  loading: boolean;
}
export const NavFilters = ({ loading }: INavFiltersProps) => {
  const [editingFilter, setEditingFilter] = useState<IFilterFormValue | null>(
    null,
  );

  const { watch, setValue } = useFormContext();

  const filters = watch('filters') || [];

  const setFilters = (value: any) => {
    setValue('filters', value, { shouldDirty: true });
  };

  const onDelete = (id: number) => {
    setFilters((filters || []).filter((it: any) => it.id !== id));
  };

  const onEdit = (filter: IProductFilter) => {
    setEditingFilter(filter as IFilterFormValue);
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Filters"
        name="filters"
        extra={
          <Dropdown
            trigger={['click']}
            menu={{
              style: { minWidth: 150 },
              items: Object.values(productFilters)
                .map((it) => ({
                  key: it.type,
                  label: it.label,
                }))
                .filter((it) => {
                  if (it.key === 'feature') {
                    return true;
                  }

                  return !filters.some(({ type }: IProductFilter) => {
                    return it.key === type;
                  });
                })
                .map((it) => ({
                  ...it,
                  onClick: (it) => {
                    setEditingFilter({
                      type: it.key as FilterType,
                      id: null,
                      title: '',
                      sortIndex: (filters || []).length,
                      controlType: 'checkbox',
                    });
                  },
                })),
            }}
          >
            <Button>Add filter</Button>
          </Dropdown>
        }
      />
      {loading && <Skeleton paragraph={{ rows: 3 }} active />}
      {!loading && !!(filters || []).length && (
        <DraggableTable
          pagination={false}
          showHeader={false}
          setDataSource={setFilters}
          columns={[
            dragIndicatorColumn,
            getNameColumn(),
            {
              render: (_v, record) => (
                <Flex gap="1">
                  <Button
                    type="text"
                    // shape="circle"
                    icon={<MdEdit   />}
                    onClick={() => onEdit(record)}
                    data-testid="edit-filter-button"
                  />
                  <Button
                    type="text"
                    // shape="circle"
                    icon={<MdClose   />}
                    onClick={() => onDelete(record.id)}
                    data-testid="delete-filter-button"
                  />
                </Flex>
              ),
              dataIndex: 'actions',
              key: 'actions',
              width: 90,
            },
          ]}
          dataSource={filters}
        />
      )}
      <FilterModal
        open={!!editingFilter}
        filter={editingFilter}
        onSubmit={(next: IFilterFormValue) => {
          if (!editingFilter?.id) {
            setFilters([...(filters || []), next]);
            setEditingFilter(null);
            return;
          }

          setFilters(
            (filters || []).map((it: IProductFilter) => {
              if (it.id === next.id) {
                return next;
              }

              return it;
            }),
          );
        }}
        onClose={() => {
          setEditingFilter(null);
        }}
      />
    </DrawerPaper>
  );
};
