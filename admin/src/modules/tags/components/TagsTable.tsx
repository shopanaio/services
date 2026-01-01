import {
  actionsColumn,
  getColumnSortProps,
  getNameColumn,
} from '@components/table/columns';
import { useTags } from '@modules/tags/hooks/useTags';
import { ITag } from '@src/entity/Tag/Tag';
import { ColumnsType } from 'antd/es/table';
import { transformColumns } from '@src/utils/utils';
import { Entity } from '@src/defs/entities';
import { useDelete } from '@modules/shared/hooks/useDelete';
import { TagModal } from '@modules/tags/components/Modal';
import { useState } from 'react';
import { Tag } from 'antd';
import { tagColumns } from '@modules/tags/defs';
import { DataTable } from '@src/layouts/table/components/Table';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { Paper } from '@components/paper/Paper';
import { SettingsNav } from '@modules/settings/components/Nav';
import { SETTINGS_TABS } from '@modules/settings/defs';

export const TagsTable = () => {
  const { tags, loading, navigation } = useTags();
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ITag | null>(null);

  const { sortProps, selectedRowsProps } = navigation;
  const { selectedRows, onChangeSelectedRows } = selectedRowsProps;

  const { deleteEntry } = useDelete();

  const columns: ColumnsType<ITag> = [
    {
      ...getNameColumn(),
      ...getColumnSortProps(tagColumns.title.key, navigation.sortProps),
      key: tagColumns.title.key,
      title: tagColumns.title.label,
      width: tagColumns.title.width,
    },
    {
      dataIndex: 'slug',
      key: tagColumns.slug.key,
      title: tagColumns.slug.label,
      width: tagColumns.slug.width,
      ...getColumnSortProps(tagColumns.slug.key, sortProps),
    },
    {
      dataIndex: 'color',
      key: tagColumns.color.key,
      title: tagColumns.color.label,
      width: tagColumns.color.width,
      render: (color: string) =>
        color ? <Tag color={color.toLowerCase()}>{color}</Tag> : null,
      ...getColumnSortProps(tagColumns.color.key, sortProps),
    },
    {
      fixed: 'right' as const,
      ...actionsColumn({
        onDelete: ({ id }) => {
          deleteEntry(id, Entity.Tag);
        },
        onEdit: (tag: ITag) => {
          setEditingTag(tag);
          setTagModalOpen(true);
        },
      }),
    },
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

  return (
    <>
      <TagModal
        open={tagModalOpen}
        tag={editingTag}
        onClose={() => {
          setTagModalOpen(false);
          setEditingTag(null);
        }}
      />
      <PageLayout
        errors={{}}
        name="tags"
        headerProps={{
          switchLocale: false,
          status: false,
          submitButtonProps: {
            icon: null,
            children: 'Create',
            onClick: () => {
              setTagModalOpen(true);
            },
          },
          title: 'Tags',
        }}
        leftColumn={[
          <Paper>
            <DataTable
              {...{
                name: 'tags',
                layout: 'fixed',
                sticky: true,
                loading,
                selectedRows,
                onChangeSelectedRows,
                onRow: (record: ITag) => {
                  setEditingTag(record);
                  setTagModalOpen(true);
                },
                columns: activeColumns,
                data: tags,
              }}
            />
          </Paper>,
        ]}
        rightColumn={<SettingsNav tab={SETTINGS_TABS.TAGS} isDirty={false} />}
      />
    </>
  );
};
