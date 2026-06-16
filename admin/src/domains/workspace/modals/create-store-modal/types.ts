export enum CreateStoreSteps {
  Information = 0,
  Localization = 1,
  Finish = 2,
}

export interface ICreateStoreFormValues {
  name: string;
  country: string | null;
  currency: string | null;
  locales: string[];
}
