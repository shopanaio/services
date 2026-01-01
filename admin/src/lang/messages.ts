import en from './en.json';
import ru from './ru.json';
import productsEn from './products.en.json';
import productsRu from './products.ru.json';
import authEn from './auth.en.json';
import authRu from './auth.ru.json';
import categoriesEn from './categories.en.json';
import categoriesRu from './categories.ru.json';
import ordersEn from './orders.en.json';
import ordersRu from './orders.ru.json';
import accountEn from './account.en.json';
import accountRu from './account.ru.json';
import customersEn from './customers.en.json';
import customersRu from './customers.ru.json';
import reviewsEn from './reviews.en.json';
import reviewsRu from './reviews.ru.json';
import settingsEn from './settings.en.json';
import settingsRu from './settings.ru.json';
import mediaEn from './media.en.json';
import mediaRu from './media.ru.json';
import menusEn from './menus.en.json';
import menusRu from './menus.ru.json';
import tagsEn from './tags.en.json';
import tagsRu from './tags.ru.json';
import translationsEn from './translations.en.json';
import translationsRu from './translations.ru.json';
import projectsEn from './projects.en.json';
import projectsRu from './projects.ru.json';

export const messages = {
  en: {
    ...en,
    ...authEn,
    ...categoriesEn,
    ...ordersEn,
    ...productsEn,
    ...accountEn,
    ...customersEn,
    ...reviewsEn,
    ...settingsEn,
    ...mediaEn,
    ...menusEn,
    ...tagsEn,
    ...translationsEn,
    ...projectsEn,
  },
  ru: {
    ...ru,
    ...authRu,
    ...categoriesRu,
    ...ordersRu,
    ...productsRu,
    ...accountRu,
    ...customersRu,
    ...reviewsRu,
    ...settingsRu,
    ...mediaRu,
    ...menusRu,
    ...tagsRu,
    ...translationsRu,
    ...projectsRu,
  },
};

type IntlMessage = keyof typeof messages.en;

export const t = (id: IntlMessage) => id;
