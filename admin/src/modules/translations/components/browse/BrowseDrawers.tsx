import {
  getColumnSortProps,
  getCoverColumn,
  getNameColumn,
  productCoverColumn,
} from '@components/table/columns';
import { useBrowseTags } from '@modules/tags/hooks/useBrowse';
import { IEntryOption } from '@src/entity/EntryOption/EntryOption';
import { ColumnsType } from 'antd/es/table';
import { tagColumns } from '@modules/tags/defs';
import { useBrowseCategories } from '@modules/categories/hooks/useBrowseCategories';
import { categoryColumns } from '@modules/categories/defs';
import { useMenus } from '@modules/menus/hooks/menu';
import { useBrowseProducts } from '@modules/products/hooks/useBrowseProducts';
import { productColumns } from '@modules/products/defs';
import { useBrowsePages } from '@modules/pages/hooks/useBrowse';
import { createBrowseTranslateDrawerHOC } from '@modules/translations/components/browse/BrowseTranslationsHOC';
import { EntityType } from '@src/graphql';
import { menuColumns } from '@modules/menus/defs';

const value = [] as any[];
const useBrowseTranslateTags = () => {
  const result = useBrowseTags({
    isActive: true,
    value,
  });

  const columns: ColumnsType<IEntryOption> = [
    {
      ...getNameColumn(),
      ...getColumnSortProps(tagColumns.title.key, result.navigation.sortProps),
      width: tagColumns.title.width,
    },
  ];

  return { ...result, columns };
};

const useBrowseTranslateCategories = () => {
  const result = useBrowseCategories({
    isActive: true,
    selectedRows: value,
  });

  const columns = [
    {
      ...getNameColumn({ coverPath: 'cover' }),
      ...getColumnSortProps('title', result.navigation.sortProps),
    },
  ];

  return { ...result, columns };
};

const useBrowseTranslateMenus = () => {
  const result = useMenus();

  const columns = [
    {
      ...getNameColumn(),
      ...getColumnSortProps(menuColumns.title.key, result.navigation.sortProps),
      key: menuColumns.title.key,
      title: menuColumns.title.label,
      width: menuColumns.title.width,
    },
  ];

  return { ...result, columns };
};

const useBrowseTranslateProducts = () => {
  const result = useBrowseProducts({
    isActive: true,
    selectedRows: value,
  });

  const columns = [
    {
      ...getNameColumn({ coverPath: 'cover' }),
      ...getColumnSortProps('title', result.navigation.sortProps),
    },
  ];

  return { ...result, columns };
};

const useBrowseTranslatePages = () => {
  const result = useBrowsePages({
    isActive: true,
    value,
  });

  const columns = [
    {
      ...getNameColumn({ coverPath: 'cover' }),
      ...getColumnSortProps('title', result.navigation.sortProps),
    },
  ];

  return { ...result, columns };
};

export const BrowseTranslateProductsDrawer = createBrowseTranslateDrawerHOC({
  title: 'Products',
  entityType: EntityType.ProdContainer,
  useEntries: useBrowseTranslateProducts,
});

export const BrowseTranslateCategoriesDrawer = createBrowseTranslateDrawerHOC({
  title: 'Categories',
  entityType: EntityType.Category,
  useEntries: useBrowseTranslateCategories,
});

export const BrowseTranslateMenusDrawer = createBrowseTranslateDrawerHOC({
  title: 'Menus',
  entityType: EntityType.Menu,
  useEntries: useBrowseTranslateMenus,
});

export const BrowseTranslatePagesDrawer = createBrowseTranslateDrawerHOC({
  title: 'Pages',
  entityType: EntityType.Page,
  useEntries: useBrowseTranslatePages,
});

export const BrowseTranslateTagsDrawer = createBrowseTranslateDrawerHOC({
  title: 'Tags',
  entityType: EntityType.Tag,
  useEntries: useBrowseTranslateTags,
});
