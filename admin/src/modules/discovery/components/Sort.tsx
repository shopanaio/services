import { DraggableTable } from '@components/table/DraggableTable';
import { dragIndicatorColumn } from '@components/table/columns';
import { ClientProductSortOptions } from '@modules/products/defs';
import { ISortOption } from '@src/entity/ProductFilter/SortOption';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Dropdown, Skeleton, Typography } from 'antd';
import { useFormContext } from 'react-hook-form';

interface INavSortProps {
  loading: boolean;
}

export const NavSort = ({ loading }: INavSortProps) => {
  const { watch, setValue } = useFormContext();

  const sortOptions = watch('sortOptions');

  const setSortOptions = (value: any) => {
    setValue('sortOptions', value, { shouldDirty: true });
  };

  // const onDelete = (id: number) => {
  //   setSortOptions((sortOptions || []).filter((it: any) => it.id !== id));
  // };

  const items = Object.values(ClientProductSortOptions)
    .filter(
      (it) =>
        !(sortOptions || []).some(({ type }: ISortOption) => it.key === type),
    )
    .map((it) => {
      return {
        onClick: async () => {},
        label: it.label,
        key: it.key,
      };
    });

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Sort options"
        extra={
          <Dropdown
            disabled={!items.length}
            trigger={['click']}
            menu={{
              style: { minWidth: 150 },
              items,
            }}
          >
            <Button>Add option</Button>
          </Dropdown>
        }
      />
      {loading && <Skeleton paragraph={{ rows: 3 }} active />}
      {!loading && !!(sortOptions || []).length && (
        <DraggableTable
          pagination={false}
          showHeader={false}
          setDataSource={setSortOptions}
          columns={[
            dragIndicatorColumn,
            {
              key: 'name',
              dataIndex: 'type',
              title: 'Name',
              render: (value) => (
                <Typography.Text>
                  {ClientProductSortOptions[
                    value as keyof typeof ClientProductSortOptions
                  ]?.label || 'Internal. No label'}
                </Typography.Text>
              ),
            },
            // { TODO: implement delete sort option
            //   render: (_v, record) => (
            //     <Button
            //       type="text"
            //       shape="circle"
            //       icon={<MdClose   />}
            //       onClick={() => onDelete(record.id)}
            //       data-testid="delete-sort-option-button"
            //     />
            //   ),
            //   dataIndex: 'actions',
            //   key: 'actions',
            //   width: 40,
            // },
          ]}
          dataSource={sortOptions}
        />
      )}
    </DrawerPaper>
  );
};
