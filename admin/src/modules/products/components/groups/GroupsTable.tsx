import { DraggableTable } from '@components/table/DraggableTable';
import { getNameColumn } from '@components/table/columns';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { ProductGroupItem } from '@modules/products/components/groups/Item';
import {
  InternalProductGroup,
  IProductGroupFormValues,
} from '@modules/products/components/groups/schema';
import { IProductGroupItem } from '@src/entity/ProductGroup/ProductGroupItem';
import { App, Button, Tag } from 'antd';
import { MdClose, MdDragIndicator, MdEdit } from 'react-icons/md';

interface IProductGroupsTableProps {
  value: InternalProductGroup[];
  id?: string;
  onChange: (value: InternalProductGroup[]) => void;
  isEditing?: boolean;
  onDone: (value: IProductGroupFormValues[]) => void;
  loading: boolean;
  onDelete: (id: ID) => void;
  onSort: (groups: IProductGroupFormValues[]) => void;
}

export const ProductGroupsTable = ({
  value,
  onChange,
  isEditing,
  onDone,
  loading,
  onDelete,
  onSort,
}: IProductGroupsTableProps) => {
  const { modal } = App.useApp();

  const onEdit = (id: any) => {
    onChange(
      value.map((it: any) => (it.id === id ? { ...it, isEditing: true } : it)),
    );
  };

  const onCancel = () => {
    onChange(
      value.filter((it) => !it.isNew).map(({ isEditing: _, ...it }) => it),
    );
  };

  const onDeleteComponent = (id: ID) => {
    const content = 'Are you sure you want to delete this component?';

    modal.confirm({
      title: 'Delete component',
      content,
      icon: null,
      onOk: () => {
        onDelete(id);
      },
    });
  };

  const onSubmit = (group: InternalProductGroup) => {
    const { isEditing: _1, isNew: _2, ...rest } = group;
    onDone(value.map((it) => (it.id === group.id ? rest : it)));
  };

  const colspan = (record: InternalProductGroup, span: number) =>
    record.isEditing ? span : 1;

  return (
    <DraggableTable
      pagination={false}
      showHeader={false}
      loading={loading}
      isDraggable={!isEditing}
      setDataSource={onSort}
      dataSource={value || []}
      // @ts-expect-error
      onRow={(_, idx) => ({
        'data-testid': `${name}-row-${idx}`,
        css: css`
          cursor: ${isEditing ? 'default' : 'pointer'};
        `,
      })}
      columns={[
        {
          key: 'drag',
          width: 30,
          onCell: (record) => ({
            colSpan: colspan(record, 4),
            style: record.isEditing
              ? { backgroundColor: 'var(--color-gray-2)' }
              : {},
          }),
          render: (_, record) => {
            if (record.isEditing) {
              return (
                <ProductGroupItem
                  group={record}
                  onClose={onCancel}
                  loading={loading}
                  onSubmit={(next) => {
                    onSubmit({ ...record, ...next });
                  }}
                />
              );
            }

            return (
              <Flex
                px="1"
                align="center"
                css={css`
                  cursor: move;
                `}
              >
                <MdDragIndicator
                  color={
                    isEditing ? 'var(--color-gray-4)' : 'var(--color-gray-8)'
                  }
                />
              </Flex>
            );
          },
        },
        {
          ...getNameColumn(),
          width: 240,
          onCell: (record) => ({
            colSpan: colspan(record, 0),
            onClick: () => onEdit(record.id),
          }),
        },
        {
          key: 'products',
          dataIndex: 'items',
          onCell: (record) => ({
            colSpan: colspan(record, 0),
          }),
          render: (items) => {
            return (
              <Flex
                css={css`
                  flex-wrap: wrap;
                  row-gap: var(--x2);
                `}
              >
                {(items || []).map((it: IProductGroupItem) => {
                  return (
                    <Tag
                      key={it.id}
                      data-testid="group-item-value"
                      color="blue"
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: var(--x1);
                        cursor: pointer;
                      `}
                    >
                      {it.product.title}
                    </Tag>
                  );
                })}
              </Flex>
            );
          },
        },
        {
          dataIndex: 'actions',
          key: 'actions',
          width: 90,
          onCell: (record) => ({
            colSpan: colspan(record, 0),
          }),
          render: (_v, record) =>
            record.isOption ? null : (
              <Flex gap="1">
                <Button
                  type="text"
                  icon={<MdEdit />}
                  onClick={() => onEdit(record.id)}
                  data-testid={`edit-${name}-button`}
                  disabled={isEditing}
                />
                <Button
                  type="text"
                  icon={<MdClose />}
                  onClick={() => onDeleteComponent(record.id)}
                  data-testid={`delete-${name}-button`}
                  disabled={isEditing}
                />
              </Flex>
            ),
        },
      ]}
    />
  );
};
