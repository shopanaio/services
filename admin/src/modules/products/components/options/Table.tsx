import { DraggableTable } from '@components/table/DraggableTable';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { OptionFormContainer } from '@modules/products/components/options/FormContainer';
import { IFeatureCallbacks } from '@modules/products/components/options/Options';
import {
  IProductFeature,
  IProductFeatureGroup,
} from '@src/entity/Product/ProductFeature';
import { isSyntheticId } from '@src/utils/synthetic-id';
import { App, Button, Switch, Tag, Typography } from 'antd';
import { MdClose, MdDragIndicator, MdEdit } from 'react-icons/md';

interface IProductFeaturesTableProps extends IFeatureCallbacks {
  name: 'options' | 'attributes';
  value: IProductFeatureGroup[];
  id?: string;
  isEditing?: boolean;
  onChange: (items: any[]) => void;
  loading: boolean;
}

export const ProductFeaturesTable = ({
  name,
  value,
  isEditing,
  onChange,
  onSort,
  onDone,
  loading,
  onDelete: onDeleteProp,
}: IProductFeaturesTableProps) => {
  const { modal } = App.useApp();
  const isOption = name === 'options';

  const onDelete = (id: any) => {
    const title = isOption ? 'Delete option' : 'Delete feature';
    const content = isOption
      ? 'Are you sure you want to delete this option? This will remove all the variants that have this option.'
      : 'Are you sure you want to delete this feature?';

    modal.confirm({
      title,
      content,
      icon: null,
      onOk: () => {
        onDeleteProp(id);
      },
    });
  };

  const onEdit = (id: any) => {
    onChange(
      value.map((it: any) => (it.id === id ? { ...it, isEditing: true } : it)),
    );
  };

  const onChangeRecord = (nextRecord: IProductFeatureGroup) => {
    onChange(
      value.map((it: any) => {
        return it.id !== nextRecord.id ? it : nextRecord;
      }),
    );
  };

  const onCancel = (id: ID) => {
    if (isSyntheticId(id)) {
      onChange(value.filter((it) => it.id !== id));
      return;
    }

    onChange(
      value.map((it) => {
        if (it.id !== id) {
          return it;
        }

        const { isEditing: _, ...rest } = it;
        return rest;
      }),
    );
  };

  const colspan = (record: IProductFeatureGroup, span: number) =>
    record.isEditing ? span : 1;

  return (
    <DraggableTable
      pagination={false}
      showHeader={false}
      isDraggable={!isEditing}
      setDataSource={(next) => onSort(next)}
      loading={loading}
      onRow={(record, idx) => ({
        'data-testid': `${name}-row-${idx}`,
        style: {
          ...(loading && { pointerEvents: 'none' }),
          ...(!isEditing && { cursor: 'pointer' }),
        },
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
                <OptionFormContainer
                  name={name}
                  loading={loading}
                  option={record}
                  onClose={() => onCancel(record.id)}
                  onSubmit={(option) => {
                    onDone(record.id, { ...record, ...option });
                  }}
                />
              );
            }
            return (
              <div
                data-testid={`product-${name}-drag-handle`}
                css={css`
                  cursor: move;
                  padding: 0 var(--x1);
                `}
              >
                <MdDragIndicator
                  color={
                    isEditing ? 'var(--color-gray-4)' : 'var(--color-gray-8)'
                  }
                />
              </div>
            );
          },
        },
        {
          width: 240,
          onCell: (record) => ({
            colSpan: colspan(record, 0),
            onClick: () => {
              if (isEditing || (!isOption && record.isOption)) {
                return;
              }

              onEdit(record.id);
            },
          }),
          render: (_, record: IProductFeatureGroup) => {
            return <Typography.Text>{record.title}</Typography.Text>;
          },
        },
        {
          key: 'features',
          dataIndex: 'features',
          onCell: (record) => ({
            colSpan: colspan(record, 0),
          }),
          render: (values, record) => {
            if (!isOption && record.isOption) {
              return (
                <Flex gap="2" align="center" as="label" h="32px">
                  <Switch
                    data-testid="use-option-as-feature-switch"
                    size="small"
                    checked={record.isActive}
                    onChange={(checked) => {
                      onChangeRecord({ ...record, isActive: checked });
                    }}
                  />
                  <Typography.Text>Include this option</Typography.Text>
                </Flex>
              );
            }

            return (
              <Flex
                css={css`
                  flex-wrap: wrap;
                  row-gap: var(--x2);
                `}
              >
                {(values || []).map((it: IProductFeature) => {
                  return (
                    <Tag
                      key={it.id}
                      data-testid={`product-${name}-value`}
                      color="blue"
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: var(--x1);
                        cursor: pointer;
                      `}
                    >
                      {it.title}
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
          onCell: (record) => ({ colSpan: colspan(record, 0) }),
          render: (_v, record) =>
            !isOption && record.isOption ? null : (
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
                  onClick={() => onDelete(record.id)}
                  data-testid={`delete-${name}-button`}
                  disabled={isEditing}
                />
              </Flex>
            ),
        },
      ]}
      dataSource={value || []}
    />
  );
};
