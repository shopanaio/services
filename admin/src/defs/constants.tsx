import {
  ApiCollectionMeta,
  DimensionUnit,
  EntityStatus,
  WeightUnit,
} from '@src/graphql';
import { t } from '@src/lang/messages';
import { FormattedMessage } from 'react-intl';

export enum Currencies {
  UAH = 'uah',
  USD = 'usd',
}

// TODO: align with i18n locales
export enum Locales {
  UK = 'uk',
  EN = 'en',
}

export enum LocalStorageKeys {
  CURRENCY = 'currency',
  LOCALE = 'locale',
}

export enum MutationTypes {
  EDIT = 'edit',
  CREATE = 'create',
}

export const DEFAULT_ENTITY_STATUS = EntityStatus.Published;
export const DEFAULT_CURRENCY = Currencies.USD;
export const DEFAULT_LOCALE = Locales.EN;
export const DEFAULT_PAGE_SIZE = 25;

export enum ConditionTypes {
  AND = 'and',
  OR = 'or',
}

export enum StockStatuses {
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PREORDER = 'PREORDER',
}

// export enum StockStatuses {
//   IN_STOCK = 'in_stock',
//   OUT_OF_STOCK = 'out_of_stock',
//   PREORDER = 'pre_order',
// }

export const stockStatuses = {
  [StockStatuses.IN_STOCK]: {
    label: 'In stock',
    value: StockStatuses.IN_STOCK,
    color: 'green',
  },
  [StockStatuses.OUT_OF_STOCK]: {
    label: 'Out of stock',
    value: StockStatuses.OUT_OF_STOCK,
    color: 'red',
  },
  [StockStatuses.PREORDER]: {
    label: 'Preorder',
    value: StockStatuses.PREORDER,
    color: 'blue',
  },
};

export const stockStatusMessageIds: Record<StockStatuses, string> = {
  [StockStatuses.IN_STOCK]: 'products.stockStatus.inStock',
  [StockStatuses.OUT_OF_STOCK]: 'products.stockStatus.outOfStock',
  [StockStatuses.PREORDER]: 'products.stockStatus.preorder',
};

export const entityStatuses = {
  [EntityStatus.Published]: {
    label: <FormattedMessage id={t('common.status.published')} />,
    value: EntityStatus.Published,
    color: 'green',
  },
  [EntityStatus.Draft]: {
    label: <FormattedMessage id={t('common.status.draft')} />,
    value: EntityStatus.Draft,
    color: 'gray',
  },
};

export enum ContentFieldEnum {
  TITLE = 'title',
  DESCRIPTION = 'description',
  EXCERPT = 'excerpt',
}

export const allContentFields = [
  ContentFieldEnum.TITLE,
  ContentFieldEnum.DESCRIPTION,
  ContentFieldEnum.EXCERPT,
];

export const emptyCollectionMeta = {
  page: 1,
  pageSize: 25,
  count: 0,
  total: 0,
  pageCount: 0,
} as ApiCollectionMeta;

export const allowedTemplates = [
  'CustomerInvitation',
  'CustomerSignUp',
  'CustomerResetPassword',
  'CustomerOrderCreated',
  'CustomerOrderShipped',
  'CustomerOrderDelivered',
];

export const emailTypeLabels = {
  CustomerInvitation: 'Customer: Invited',
  CustomerSignUp: 'Customer: Sign Up',
  CustomerResetPassword: 'Customer: Reset Password',
  CustomerOrderCreated: 'Order: Created',
  CustomerOrderDelivered: 'Order: Delivered',
  CustomerOrderShipped: 'Order: Shipped',
  TenantInvitation: 'Tenant: Invite',
  TenantResetPassword: 'Tenant: ResetPassword',
  TenantSignUp: 'Tenant: SignUp',
};

export enum ProductPriority {
  Critical = 100,
  High = 200,
  Moderate = 300,
  Low = 400,
  Minimal = 500,
}

export const PriorityLabels = {
  [ProductPriority.Critical]: 'Critical',
  [ProductPriority.High]: 'High',
  [ProductPriority.Moderate]: 'Moderate',
  [ProductPriority.Low]: 'Low',
  [ProductPriority.Minimal]: 'Minimal',
};

export const AUTH_TOKEN = btoa('shopana-cms-auth-token');

export const weightUniOptions = {
  [WeightUnit.Gr]: {
    key: WeightUnit.Gr,
    label: 'g',
  },
  [WeightUnit.Kg]: {
    key: WeightUnit.Kg,
    label: 'kg',
  },
  [WeightUnit.Oz]: {
    key: WeightUnit.Oz,
    label: 'oz',
  },
  [WeightUnit.Lb]: {
    key: WeightUnit.Lb,
    label: 'lb',
  },
};

export const dimensionUnitOptions = {
  [DimensionUnit.Mm]: {
    key: DimensionUnit.Mm,
    label: 'mm',
  },
  [DimensionUnit.Cm]: {
    key: DimensionUnit.Cm,
    label: 'cm',
  },
  [DimensionUnit.M]: {
    key: DimensionUnit.M,
    label: 'm',
  },
  [DimensionUnit.In]: {
    key: DimensionUnit.In,
    label: 'in',
  },
};

export const PROJECT_KEY_HEADER = 'X-Pj-Key';
