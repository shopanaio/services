import {
  BrowseTranslateCategoriesDrawer,
  BrowseTranslateMenusDrawer,
  BrowseTranslatePagesDrawer,
  BrowseTranslateProductsDrawer,
  BrowseTranslateTagsDrawer,
} from '@modules/translations/components/browse/BrowseDrawers';
import { EntityType } from '@src/graphql';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';

export const BrowseTranslationDrawer = () => {
  const { entityType } = useEntityDrawer();

  switch (entityType as EntityType) {
    case EntityType.ProdContainer:
      return <BrowseTranslateProductsDrawer />;
    case EntityType.Category:
      return <BrowseTranslateCategoriesDrawer />;
    case EntityType.Menu:
      return <BrowseTranslateMenusDrawer />;
    case EntityType.Page:
      return <BrowseTranslatePagesDrawer />;
    case EntityType.Tag:
      return <BrowseTranslateTagsDrawer />;
    default:
      return null;
  }
};
