import { VariantForm } from '@modules/products/components/variants/VariantForm';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { EditPage } from '@modules/pages/components/Edit';
import { EditCustomer } from '@modules/customers/components/Edit';
// import { EditOrder } from '@modules/orders/components/Edit';
import { TranslationDrawer } from '@modules/translations/components/TranslationDrawer';
import { ProductForm } from '@modules/products/components/Form';
import { CategoryForm } from '@modules/categories/components/Form';
import { MenuDrawer } from '@modules/menus/components/MenuDrawer';
import { BrowseTranslationDrawer } from '@modules/translations/components/browse/Browse';
import { ReviewForm } from '@modules/reviews/components/Form';

export const DrawerModuleMap = {
  [DrawerTypes.BROWSE_TRANSLATION]: BrowseTranslationDrawer,
  [DrawerTypes.CATEGORY]: CategoryForm,
  [DrawerTypes.CUSTOMER]: EditCustomer,
  [DrawerTypes.MENU]: MenuDrawer,
  // [DrawerTypes.ORDER]: EditOrder,
  [DrawerTypes.PAGE]: EditPage,
  [DrawerTypes.PRODUCT_VARIANT]: VariantForm,
  [DrawerTypes.PRODUCT]: ProductForm,
  [DrawerTypes.REVIEW]: ReviewForm,
  [DrawerTypes.TRANSLATION]: TranslationDrawer,
};
