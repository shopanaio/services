import { SortableTree } from '@components/sortableTree/SortableTree';
import { TreeItem, TreeItems } from '@components/sortableTree/types';
import { removeItem, replaceItem } from '@components/sortableTree/utilities';
import { UniqueIdentifier } from '@dnd-kit/core';
import { css } from '@emotion/react';
import { LinkModal } from '@modules/navigation/components/LinkModal';
import { ILinkFormValue } from '@modules/navigation/defs';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Skeleton } from 'antd';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export const Menu = ({
  loading,
  menuId,
}: {
  loading: boolean;
  menuId: number;
}) => {
  const [editingLink, setEditingLink] = useState<ILinkFormValue | null>(null);

  const { watch, setValue } = useFormContext();

  const items = watch('menuItems');

  const setItems = (items: TreeItems, shouldDirty = true) => {
    setValue('menuItems', items, { shouldDirty });
  };

  const handleChange = (items: TreeItems) => {
    setItems(
      items /** TODO: set placeholders to the end of each parent's items */,
    );
  };

  function handleRemove(id: UniqueIdentifier) {
    setItems(removeItem(items, id));
  }

  function handleEdit(item: TreeItem) {
    setEditingLink({
      id: item.id,
      title: item.title,
      entry: item.entry,
      parentId: item.parentId,
      slug: item.slug,
      sortIndex: item.sortIndex,
      type: item.type,
      children: item.children,
      menuId,
    });
  }

  return (
    <DrawerPaper
      css={css`
        padding-bottom: 0;
      `}
    >
      <DrawerPaperHeader
        name="menu"
        title="Menu items"
        extra={
          <Button
            onClick={() => {
              setEditingLink({
                id: null,
                title: '',
                entry: null,
                parentId: null,
                slug: '',
                children: [],
                sortIndex: items.length || 0,
                type: null,
                menuId,
              });
            }}
          >
            Add item
          </Button>
        }
      />
      {loading ? (
        <Skeleton active />
      ) : (
        <div
          css={css`
            background-color: var(--color-gray-2);
            margin: 0 calc(-1 * var(--x4));
          `}
        >
          <SortableTree
            value={items}
            onChange={handleChange}
            onEdit={handleEdit}
            onRemove={handleRemove}
          />
        </div>
      )}
      <LinkModal
        link={editingLink}
        onClose={() => setEditingLink(null)}
        onSubmit={(next: TreeItem) => {
          if (editingLink?.id) {
            setItems(replaceItem(items, next.id, { ...editingLink, ...next }));
            setEditingLink(null);
            return;
          }

          setItems(
            [...items, { ...next, children: [], collapsed: false }],
            false,
          );
          setEditingLink(null);
        }}
        open={!!editingLink}
      />
    </DrawerPaper>
  );
};
