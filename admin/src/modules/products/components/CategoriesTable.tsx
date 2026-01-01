import { Paper } from '@components/paper/Paper';
import { DraggableTable } from '@components/table/DraggableTable';
import { getNameColumn } from '@components/table/columns';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { InternalProductFeature } from '@modules/products/components/options/schema';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { Button } from 'antd';
import { MdClose, MdDragIndicator } from 'react-icons/md';

interface IProductCategoriesTableProps {
  value: InternalProductFeature[];
  onChange: (value: InternalProductFeature[]) => void;
}

export const ProductCategoriesTable = ({
  value,
  onChange,
}: IProductCategoriesTableProps) => {
  const onDelete = (id: any) => {
    onChange(value.filter((it: any) => it.id !== id));
  };

  if (!value?.length) {
    return null;
  }

  return (
    <Paper>
      <DraggableTable
        pagination={false}
        showHeader={false}
        isDraggable
        setDataSource={(next) => onChange(next)}
        onRow={(_, idx) => ({
          'data-testid': `category-row-${idx}`,
        })}
        columns={[
          {
            key: 'drag',
            width: 30,
            render: () => {
              return (
                <div
                  css={css`
                    cursor: move;
                    padding: 0 var(--x1);
                  `}
                >
                  <MdDragIndicator color="var(--color-gray-8)" />
                </div>
              );
            },
          },
          {
            ...getNameColumn(),
            onCell: (record) => ({
              onClick: () => {
                $drawers.addDrawer({
                  entityId: record.id,
                  type: DrawerTypes.CATEGORY,
                });
              },
            }),
          },
          {
            dataIndex: 'actions',
            key: 'actions',
            width: 40,
            onCell: (record) => ({
              colSpan: record.isEditing ? 0 : 1,
            }),
            render: (_v, record) =>
              record.isOption ? null : (
                <Flex gap="1">
                  <Button
                    type="text"
                    icon={<MdClose />}
                    onClick={() => onDelete(record.id)}
                    data-testid={`delete-${name}-button`}
                  />
                </Flex>
              ),
          },
        ]}
        dataSource={value || []}
      />
    </Paper>
  );
};
