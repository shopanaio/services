import { slugify as s } from 'transliteration';

export const slugify = (value: string) => {
  return s(value);
};
