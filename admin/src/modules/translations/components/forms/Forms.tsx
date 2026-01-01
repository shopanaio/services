import { createTranslateForm } from '@modules/translations/components/forms/FormHOC';
import { TranslateInformationFields } from '@modules/translations/components/forms/InformationFIelds';
import { TranslateMenuFormComponent } from '@modules/translations/components/forms/MenuForm';
import { TranslateProductFormComponent } from '@modules/translations/components/forms/ProductForm';
import type { IGenericTranslationData } from '@modules/translations/types';
import { TranslateTagFormComponent } from '@modules/translations/components/forms/TagForm';
import { useTranslationCategory } from '@modules/translations/hooks/useTranslationCategory';
import { useTranslationMenu } from '@modules/translations/hooks/useTranslationMenu';
import { useTranslationPage } from '@modules/translations/hooks/useTranslationPage';
import { useTranslationProduct } from '@modules/translations/hooks/useTranslationProduct';
import { useTranslationTag } from '@modules/translations/hooks/useTranslationTag';
import {
  getInfoTranslationPayload,
  getMenuTranslationPayload,
  getProductTranslationPayload,
  getTagTranslationPayload,
  getCategoryTranslationPayload,
} from '@modules/translations/utils/payload';

export const TranslateProductForm = createTranslateForm({
  useFetchData: useTranslationProduct,
  getPayload: getProductTranslationPayload,
  component: TranslateProductFormComponent,
});

export const TranslateCategoryForm = createTranslateForm({
  useFetchData: useTranslationCategory,
  getPayload: getCategoryTranslationPayload,
  component: TranslateInformationFields,
});

export const TranslatePageForm = createTranslateForm({
  useFetchData: useTranslationPage,
  getPayload: getInfoTranslationPayload,
  component: TranslateInformationFields,
});

export const TranslateMenuForm = createTranslateForm({
  useFetchData: useTranslationMenu,
  getPayload: getMenuTranslationPayload,
  component: TranslateMenuFormComponent,
});

export const TranslateTagForm = createTranslateForm({
  useFetchData: useTranslationTag,
  getPayload: getTagTranslationPayload,
  component: TranslateTagFormComponent,
});
