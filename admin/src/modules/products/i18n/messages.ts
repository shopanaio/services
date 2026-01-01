import en from '@src/lang/products.en.json';
import ru from '@src/lang/products.ru.json';

type ProductsIntlMessage = keyof typeof en;

export const t = (id: ProductsIntlMessage) => id;

export const messages = {
  en: en as Record<string, string>,
  ru: ru as Record<string, string>,
};
