import { makeMethod, makeStore } from '@reframework/qx';
import { ILocale } from '@src/entity/Locale/Locale';

type ILocalesStore = {
  locales: ILocale[];
};

const store = makeStore<ILocalesStore>('system', {
  locales: [],
});

export const $locales = {
  store,
  setLocales: makeMethod(store, (state, locales: ILocale[]) => {
    return {
      ...state,
      locales,
      locale: locales[0] || null,
    };
  }),
};
