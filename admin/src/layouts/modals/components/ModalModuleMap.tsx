import { VariantForm } from '@modules/products/components/variants/VariantForm';
import { ModalTypes } from '@src/layouts/modals/types';
import { EditPage } from '@modules/pages/components/Edit';
import { EditCustomer } from '@modules/customers/components/Edit';
import { TranslationDrawer } from '@modules/translations/components/TranslationDrawer';
import { ProductForm } from '@modules/products/components/Form';
import { CategoryForm } from '@modules/categories/components/Form';
import { MenuDrawer } from '@modules/menus/components/MenuDrawer';
import { BrowseTranslationDrawer } from '@modules/translations/components/browse/Browse';
import { ReviewForm } from '@modules/reviews/components/Form';

export const ModalModuleMap: Record<ModalTypes, React.ComponentType<any>> = {
  [ModalTypes.BROWSE_TRANSLATION]: BrowseTranslationDrawer,
  [ModalTypes.CATEGORY]: CategoryForm,
  [ModalTypes.CUSTOMER]: EditCustomer,
  [ModalTypes.MENU]: MenuDrawer,
  [ModalTypes.PAGE]: EditPage,
  [ModalTypes.PRODUCT_VARIANT]: VariantForm,
  [ModalTypes.PRODUCT]: ProductForm,
  [ModalTypes.REVIEW]: ReviewForm,
  [ModalTypes.TRANSLATION]: TranslationDrawer,
};
