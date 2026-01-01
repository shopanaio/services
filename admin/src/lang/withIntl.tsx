import { FC, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { useSelector } from '@reframework/qx';
import { $session } from '@modules/auth/store/session';
import globalEn from '@src/lang/en.json';
import globalRu from '@src/lang/ru.json';

type SupportedLocale = 'en' | 'ru';

type ModuleMessages = {
  en: Record<string, string>;
  ru: Record<string, string>;
};

const detectLocale = (user?: any): SupportedLocale => {
  const supportedLocales: SupportedLocale[] = ['en', 'ru'];
  if (user?.language && supportedLocales.includes(user.language)) {
    return user.language as SupportedLocale;
  }
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || navigator.languages?.[0]).slice(
      0,
      2,
    ) as SupportedLocale;
    if (supportedLocales.includes(lang)) {
      return lang;
    }
  }
  return 'ru';
};

export const withIntl = (moduleMessages: ModuleMessages) => {
  const IntlWrapper = ({ children }: { children: ReactNode }) => {
    const user = useSelector($session.currentUser);
    const locale = detectLocale(user);

    const messages =
      locale === 'en'
        ? { ...moduleMessages.en, ...globalEn }
        : { ...moduleMessages.ru, ...globalRu };

    const Provider = IntlProvider as unknown as FC<any>;

    return (
      <Provider locale={locale} defaultLocale="ru" messages={messages}>
        {children}
      </Provider>
    );
  };

  return IntlWrapper;
};
