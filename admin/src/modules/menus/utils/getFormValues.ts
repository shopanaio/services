import { TreeItem, TreeItems } from '@components/sortableTree/types';
import { IMenuFormValues } from '@modules/menus/defs';
import { IMenuLink } from '@src/entity/Menu/Link';
import { IMenu } from '@src/entity/Menu/Menu';

const createTree = (rawItems: IMenuLink[]): TreeItems => {
  const items = [...rawItems].sort((a, b) => a.sortIndex - b.sortIndex);

  const itemMap: { [key: ID]: TreeItem } = {};

  items.forEach((item) => {
    itemMap[item.id] = { ...item, children: [] };
  });

  const roots: TreeItem[] = [];

  items.forEach((item) => {
    if (item.parentId && item.parentId in itemMap) {
      itemMap[item.parentId].children.push(itemMap[item.id]);
    } else {
      roots.push(itemMap[item.id]);
    }
  });

  return roots;
};

export const getMenuFormValues = (menu: IMenu): IMenuFormValues => ({
  title: menu.title,
  slug: menu.slug,
  menuItems: createTree(menu.items),
  id: menu.id,
  status: menu.status,
});

export const getEmptyLink = (menuId: ID, sortIndex: number) => ({
  id: null,
  title: '',
  entry: null,
  parentId: null,
  slug: '',
  children: [],
  sortIndex: sortIndex || 0,
  type: null,
  menuId,
});
