export const allowedLocales = ['uk', 'ru', 'en', 'de', 'fr'];

export const shopLocales = [
  { value: 'en', name: 'English' },
  { value: 'uk', name: 'Ukrainian' },
  { value: 'ru', name: 'Russian' },
  { value: 'de', name: 'German' },
  { value: 'fr', name: 'French' },
  { value: 'es', name: 'Spanish' },
  { value: 'it', name: 'Italian' },
  { value: 'pt', name: 'Portuguese' },
  { value: 'pl', name: 'Polish' },
  { value: 'nl', name: 'Dutch' },
  { value: 'cs', name: 'Czech' },
  { value: 'sk', name: 'Slovak' },
  { value: 'hu', name: 'Hungarian' },
  { value: 'ro', name: 'Romanian' },
  { value: 'bg', name: 'Bulgarian' },
  { value: 'hr', name: 'Croatian' },
  { value: 'sl', name: 'Slovenian' },
  { value: 'el', name: 'Greek' },
  { value: 'tr', name: 'Turkish' },
  { value: 'ar', name: 'Arabic' },
  { value: 'he', name: 'Hebrew' },
  { value: 'ja', name: 'Japanese' },
  { value: 'ko', name: 'Korean' },
  { value: 'zh', name: 'Chinese' },
  { value: 'vi', name: 'Vietnamese' },
  { value: 'th', name: 'Thai' },
  { value: 'id', name: 'Indonesian' },
  { value: 'ms', name: 'Malay' },
  { value: 'hi', name: 'Hindi' },
  { value: 'bn', name: 'Bengali' },
];

export const shopLocalesRecord = shopLocales.reduce(
  (acc, locale) => {
    acc[locale.value] = locale;
    return acc;
  },
  {} as Record<string, { value: string; name: string }>
);
