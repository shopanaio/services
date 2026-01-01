import {
  TranslateCategoryForm,
  TranslateMenuForm,
  TranslatePageForm,
  TranslateProductForm,
  TranslateTagForm,
} from '@modules/translations/components/forms/Forms';
import { EntityType } from '@src/graphql';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';

const mapping = {
  [EntityType.ProdContainer]: TranslateProductForm,
  [EntityType.Category]: TranslateCategoryForm,
  [EntityType.Page]: TranslatePageForm,
  [EntityType.Menu]: TranslateMenuForm,
  [EntityType.Tag]: TranslateTagForm,
} as Record<EntityType, typeof TranslateProductForm>;

export const TranslationDrawer = () => {
  const { entityId, entityType, forceClose } = useEntityDrawer();

  const Form = mapping[entityType!];
  if (Form) {
    return <Form id={entityId as ID} forceClose={forceClose} />;
  }

  return null;
};
