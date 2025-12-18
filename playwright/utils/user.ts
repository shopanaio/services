import * as crypto from 'crypto';

export enum Locale {
  EN = 'en',
  RU = 'ru',
}

export enum Timezone {
  EUROPE_KIEV = 'Europe/Kiev',
}

export enum Currency {
  EUR = 'EUR',
}

export enum Country {
  UA = 'UA',
}

export interface UserData {
  uuid: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const generateUser = (): UserData => {
  const uuid = crypto.randomUUID();

  return {
    uuid,
    email: `test-${uuid}@playwright.dev`,
    password: 'StrongPassword123',
    firstName: 'Test',
    lastName: 'Testerson',
  };
};
