import type { Resolvers } from "../generated/types.js";

// Locale titles mapping
const localeNames: Record<string, string> = {
  uk: "Українська",
  en: "English",
  ru: "Русский",
  pl: "Polski",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

// Currency titles mapping
const currencyNames: Record<string, string> = {
  UAH: "Українська гривня",
  USD: "US Dollar",
  EUR: "Euro",
  PLN: "Polski złoty",
  GBP: "British Pound",
};

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    projectQuery: () => ({}),
  },

  ProjectQuery: {
    projects: async (_parent, _args, ctx) => {
      return ctx.kernel.getServices().repository.project.getMany();
    },

    project: async (_parent, { slug }, ctx) => {
      return ctx.kernel.getServices().repository.project.findBySlug(slug);
    },

    locales: async (_parent, _args, ctx) => {
      const locales = await ctx.loaders.locales.load(ctx.project.id);
      return locales.map((locale) => ({
        code: locale.code,
        title: localeNames[locale.code] ?? locale.code,
        isActive: locale.isActive,
      }));
    },

    currencies: async (_parent, _args, ctx) => {
      const currencies = await ctx.loaders.currencies.load(ctx.project.id);
      return currencies.map((currency) => ({
        code: currency.code,
        title: currencyNames[currency.code] ?? currency.code,
        isActive: currency.isActive,
        exchangeRate: currency.exchangeRate,
      }));
    },

    apiKeys: async (_parent, _args, ctx) => {
      return ctx.loaders.apiKeys.load(ctx.project.id);
    },
  },
};
