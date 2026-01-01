import { ReactNode, FC } from 'react';
import { IntlProvider } from 'react-intl';

import { messages } from '@src/lang/messages';
import { $session } from '@modules/auth/store/session';
import { useSelector } from '@reframework/qx';

export const Intl = ({ children }: { children: ReactNode }) => {
  const user = useSelector($session.currentUser);

  const supportedLocales = ['en', 'ru'] as const;
  type SupportedLocale = (typeof supportedLocales)[number];

  const detectLocale = (): SupportedLocale => {
    if (user?.language) {
      return supportedLocales.includes(user.language as SupportedLocale)
        ? (user.language as SupportedLocale)
        : 'ru';
    }

    if (typeof navigator !== 'undefined') {
      const lang = (navigator.language || navigator.languages?.[0]).slice(0, 2);
      if (supportedLocales.includes(lang as SupportedLocale)) {
        return lang as SupportedLocale;
      }
    }

    return 'ru';
  };

  const currentLocale = detectLocale();
  const currentMessages = messages[currentLocale];

  const Provider = IntlProvider as unknown as FC<any>;

  return (
    <Provider
      locale={currentLocale}
      defaultLocale="ru"
      messages={currentMessages}
    >
      {children}
    </Provider>
  );
};
