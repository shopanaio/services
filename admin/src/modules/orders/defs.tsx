import { IOrderFormValues } from '@modules/orders/types';
import { Entity } from '@src/defs/entities';
import { UiFilter } from '@src/entity/UiFilter';
import {
  PaymentStatusEnum,
  OrderStatusEnum,
  FulfillmentStatusEnum,
} from '@src/graphql';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const orderColumns = {
  orderNumber: {
    key: 'orderNumber',
    label: <FormattedMessage id={t('common.id')} />,
    isFixed: true,
    active: true,
    width: 64,
  },
  items: {
    key: 'items',
    label: <FormattedMessage id={t('common.products')} />,
    isFixed: true,
    active: true,
    width: 300,
  },
  status: {
    key: 'status',
    label: <FormattedMessage id={t('common.status')} />,
    isFixed: false,
    active: true,
    width: 120,
  },
  totalPrice: {
    key: 'totalPrice',
    label: <FormattedMessage id={t('common.total')} />,
    isFixed: false,
    active: true,
    width: 120,
  },
  totalDiscount: {
    key: 'totalDiscount',
    label: <FormattedMessage id={t('common.discount')} />,
    isFixed: false,
    active: true,
    width: 120,
  },
  fulfillmentStatus: {
    key: 'fulfillmentStatus',
    label: (
      <FormattedMessage id={t('orders.table.columns.fulfillmentStatus')} />
    ),
    isFixed: false,
    active: true,
    width: 150,
  },
  paymentStatus: {
    key: 'paymentStatus',
    label: <FormattedMessage id={t('orders.table.columns.paymentStatus')} />,
    isFixed: false,
    active: true,
    width: 150,
  },
  customer: {
    key: 'customer',
    label: <FormattedMessage id={t('orders.table.columns.customer')} />,
    isFixed: false,
    active: true,
    width: 120,
  },
  customerFirstName: {
    key: 'customerFirstName',
    label: (
      <FormattedMessage id={t('orders.table.columns.customerFirstName')} />
    ),
    isFixed: false,
    active: false,
    width: 120,
  },
  customerLastName: {
    key: 'customerLastName',
    label: <FormattedMessage id={t('orders.table.columns.customerLastName')} />,
    isFixed: false,
    active: false,
    width: 120,
  },
  customerEmail: {
    key: 'customerEmail',
    label: <FormattedMessage id={t('orders.table.columns.customerEmail')} />,
    isFixed: false,
    active: false,
    width: 120,
  },
  customerPhoneNumber: {
    key: 'customerPhoneNumber',
    label: (
      <FormattedMessage id={t('orders.table.columns.customerPhoneNumber')} />
    ),
    isFixed: false,
    active: true,
    width: 120,
  },
  shippingAddress: {
    key: 'shippingAddress',
    label: <FormattedMessage id={t('orders.table.columns.shippingAddress')} />,
    isFixed: false,
    active: true,
    width: 200,
  },
  shippingMethod: {
    key: 'shippingMethod',
    label: <FormattedMessage id={t('orders.table.columns.shippingMethod')} />,
    isFixed: false,
    active: true,
    width: 200,
  },
  billingAddress: {
    key: 'billingAddress',
    label: <FormattedMessage id={t('orders.table.columns.billingAddress')} />,
    isFixed: false,
    active: true,
    width: 200,
  },
  paymentMethod: {
    key: 'paymentMethod',
    label: <FormattedMessage id={t('orders.table.columns.paymentMethod')} />,
    isFixed: false,
    active: true,
    width: 200,
  },
  tags: {
    key: 'tags',
    label: <FormattedMessage id={t('common.tags')} />,
    isFixed: false,
    active: false,
    width: 120,
  },
  createdAt: {
    key: 'createdAt',
    label: <FormattedMessage id={t('table.createdAt')} />,
    isFixed: false,
    active: false,
    width: 120,
  },
  updatedAt: {
    key: 'updatedAt',
    label: <FormattedMessage id={t('table.updatedAt')} />,
    isFixed: false,
    active: false,
    width: 120,
  },
};

export const searchOptions = {};

export const emptyAddress = {
  id: null,
  address1: '',
  address2: '',
  city: '',
  countryCode: '',
  firstName: '',
  lastName: '',
  latitude: null,
  longitude: null,
  middleName: '',
  phone: '',
  email: '',
  state: '',
  zip: '',
  meta: null,
};

export const defaultFormValues: IOrderFormValues = {
  customer: null,
  status: OrderStatusEnum.Draft,
  customerDetails: null,
  billingAddress: null,
  fulfillmentItems: [],
  paymentItem: null,
  paymentMethod: null,
  shippingAddress: null,
  shippingMethod: null,
  id: null,
  events: [],
  tags: [],
  adminNote: null,
  customerStatistic: null,
};

export const orderStatuses = {
  [OrderStatusEnum.Active]: {
    label: <FormattedMessage id={t('orders.status.active')} />,
    value: OrderStatusEnum.Active,
    color: 'blue',
  },
  [OrderStatusEnum.Cancelled]: {
    label: <FormattedMessage id={t('orders.status.cancelled')} />,
    value: OrderStatusEnum.Cancelled,
    color: 'red',
  },
  [OrderStatusEnum.Completed]: {
    label: <FormattedMessage id={t('orders.status.completed')} />,
    value: OrderStatusEnum.Completed,
    color: 'purple',
  },
  [OrderStatusEnum.Archived]: {
    label: <FormattedMessage id={t('orders.status.archived')} />,
    value: OrderStatusEnum.Archived,
    color: 'default',
  },
  [OrderStatusEnum.Draft]: {
    label: <FormattedMessage id={t('orders.status.draft')} />,
    value: OrderStatusEnum.Draft,
    color: 'default',
  },
};

export const fulfillmentStatuses = {
  [FulfillmentStatusEnum.Pending]: {
    value: FulfillmentStatusEnum.Pending,
    label: <FormattedMessage id={t('orders.fulfillment.pending')} />,
    color: 'default',
    index: 0,
  },
  [FulfillmentStatusEnum.Processing]: {
    value: FulfillmentStatusEnum.Processing,
    label: <FormattedMessage id={t('orders.fulfillment.processing')} />,
    color: 'blue',
    index: 1,
  },
  [FulfillmentStatusEnum.OnHold]: {
    value: FulfillmentStatusEnum.OnHold,
    label: <FormattedMessage id={t('orders.fulfillment.onHold')} />,
    color: 'yellow',
    index: 3,
  },
  [FulfillmentStatusEnum.Shipped]: {
    value: FulfillmentStatusEnum.Shipped,
    label: <FormattedMessage id={t('orders.fulfillment.shipped')} />,
    color: 'blue',
    index: 4,
  },
  [FulfillmentStatusEnum.Delivered]: {
    value: FulfillmentStatusEnum.Delivered,
    label: <FormattedMessage id={t('orders.fulfillment.delivered')} />,
    color: 'green',
    index: 5,
  },
  [FulfillmentStatusEnum.Returned]: {
    value: FulfillmentStatusEnum.Returned,
    label: <FormattedMessage id={t('orders.fulfillment.returned')} />,
    color: 'magenta',
    index: 6,
  },
  [FulfillmentStatusEnum.Cancelled]: {
    value: FulfillmentStatusEnum.Cancelled,
    label: <FormattedMessage id={t('orders.fulfillment.cancelled')} />,
    color: 'red',
    index: 7,
  },
  [FulfillmentStatusEnum.Fulfilled]: {
    value: FulfillmentStatusEnum.Fulfilled,
    label: <FormattedMessage id={t('orders.fulfillment.fulfilled')} />,
    index: 100,
    color: 'purple',
  },
};

export const paymentStatuses = {
  [PaymentStatusEnum.Pending]: {
    value: PaymentStatusEnum.Pending,
    label: <FormattedMessage id={t('orders.payment.pending')} />,
    color: 'default',
    index: 0,
  },
  [PaymentStatusEnum.Cancelled]: {
    value: PaymentStatusEnum.Cancelled,
    label: <FormattedMessage id={t('orders.payment.cancelled')} />,
    color: 'red',
    index: 1,
  },
  [PaymentStatusEnum.Paid]: {
    value: PaymentStatusEnum.Paid,
    label: <FormattedMessage id={t('orders.payment.paid')} />,
    color: 'purple',
    index: 2,
  },
};

const getAddressFilters = (
  key: 'shippingAddress' | 'billingAddress' = 'shippingAddress',
) => {
  const getLabel = (nestedLabel: string) => {
    // const l = key === 'shippingAddress' ? 'Shipping' : 'Billing';
    // return `${l} address → ${nestedLabel}`;

    return `Address → ${nestedLabel}`;
  };

  return [
    {
      key: `${key}.address1`,
      label: <FormattedMessage id={t('orders.filters.address.line1')} />,
      payloadKey: `${key}.address1`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.line1.description')} />
      ),
    },
    {
      key: `${key}.address2`,
      label: <FormattedMessage id={t('orders.filters.address.line2')} />,
      payloadKey: `${key}.address2`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.line2.description')} />
      ),
    },
    {
      key: `${key}.city`,
      label: <FormattedMessage id={t('orders.filters.address.city')} />,
      payloadKey: `${key}.city`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.city.description')} />
      ),
    },
    {
      key: `${key}.countryCode`,
      label: <FormattedMessage id={t('orders.filters.address.countryCode')} />,
      payloadKey: `${key}.countryCode`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage
          id={t('orders.filters.address.countryCode.description')}
        />
      ),
    },
    {
      key: `${key}.email`,
      label: <FormattedMessage id={t('orders.filters.address.email')} />,
      payloadKey: `${key}.email`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.email.description')} />
      ),
    },
    {
      key: `${key}.firstName`,
      label: <FormattedMessage id={t('orders.filters.address.firstName')} />,
      payloadKey: `${key}.firstName`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage
          id={t('orders.filters.address.firstName.description')}
        />
      ),
    },
    {
      key: `${key}.lastName`,
      label: <FormattedMessage id={t('orders.filters.address.lastName')} />,
      payloadKey: `${key}.lastName`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage
          id={t('orders.filters.address.lastName.description')}
        />
      ),
    },
    {
      key: `${key}.middleName`,
      label: <FormattedMessage id={t('orders.filters.address.middleName')} />,
      payloadKey: `${key}.middleName`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage
          id={t('orders.filters.address.middleName.description')}
        />
      ),
    },
    {
      key: `${key}.phone`,
      label: <FormattedMessage id={t('orders.filters.address.phone')} />,
      payloadKey: `${key}.phone`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.phone.description')} />
      ),
    },
    {
      key: `${key}.state`,
      label: <FormattedMessage id={t('orders.filters.address.state')} />,
      payloadKey: `${key}.state`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.state.description')} />
      ),
    },
    {
      key: `${key}.zip`,
      label: <FormattedMessage id={t('orders.filters.address.zip')} />,
      payloadKey: `${key}.zip`,
      type: UiFilter.UiFilterType.String,
      operators: UiFilter.uiStringFilterOperators,
      description: (
        <FormattedMessage id={t('orders.filters.address.zip.description')} />
      ),
    },
  ];
};

export const orderDashboardFilters = [
  {
    key: 'address',
    label: <FormattedMessage id={t('orders.filters.address.label')} />,
    type: UiFilter.UiFilterType.Any,
    operators: [],
    children: getAddressFilters(),
    description: (
      <FormattedMessage id={t('orders.filters.address.description')} />
    ),
  },
  {
    key: 'contactInfo',
    label: <FormattedMessage id={t('orders.filters.contactInfo.label')} />,
    type: UiFilter.UiFilterType.Any,
    operators: [],
    description: (
      <FormattedMessage id={t('orders.filters.contactInfo.description')} />
    ),
    children: [
      {
        key: 'email',
        label: <FormattedMessage id={t('orders.filters.contactInfo.email')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customerEmail',
        description: (
          <FormattedMessage
            id={t('orders.filters.contactInfo.email.description')}
          />
        ),
      },
      {
        key: 'firstName',
        label: (
          <FormattedMessage id={t('orders.filters.contactInfo.firstName')} />
        ),
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customerFirstName',
        description: (
          <FormattedMessage
            id={t('orders.filters.contactInfo.firstName.description')}
          />
        ),
      },
      {
        key: 'lastName',
        label: (
          <FormattedMessage id={t('orders.filters.contactInfo.lastName')} />
        ),
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customerLastName',
        description: (
          <FormattedMessage
            id={t('orders.filters.contactInfo.lastName.description')}
          />
        ),
      },
      {
        key: 'middleName',
        label: (
          <FormattedMessage id={t('orders.filters.contactInfo.middleName')} />
        ),
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customerMiddleName',
        description: (
          <FormattedMessage
            id={t('orders.filters.contactInfo.middleName.description')}
          />
        ),
      },
      {
        key: 'phoneNumber',
        label: <FormattedMessage id={t('orders.filters.contactInfo.phone')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customerPhoneNumber',
        description: (
          <FormattedMessage
            id={t('orders.filters.contactInfo.phone.description')}
          />
        ),
      },
    ],
  },
  {
    description: (
      <FormattedMessage id={t('orders.filters.customer.description')} />
    ),
    key: 'customer',
    label: <FormattedMessage id={t('orders.filters.customer.label')} />,
    type: UiFilter.UiFilterType.Any,
    operators: [],
    children: [
      {
        key: 'customerId',
        label: <FormattedMessage id={t('orders.filters.customer.customer')} />,
        type: UiFilter.UiFilterType.Relation,
        entity: Entity.Customer,
        operators: UiFilter.uiRelationFilterOperators,
        payloadKey: 'customerId',
        description: (
          <FormattedMessage
            id={t('orders.filters.customer.customer.description')}
          />
        ),
      },
      {
        key: 'email',
        label: <FormattedMessage id={t('orders.filters.customer.email')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.email',
        description: (
          <FormattedMessage
            id={t('orders.filters.customer.email.description')}
          />
        ),
      },
      {
        key: 'firstName',
        label: <FormattedMessage id={t('orders.filters.customer.firstName')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.firstName',
        description: (
          <FormattedMessage
            id={t('orders.filters.customer.firstName.description')}
          />
        ),
      },
      {
        key: 'lastName',
        label: <FormattedMessage id={t('orders.filters.customer.lastName')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.lastName',
        description: (
          <FormattedMessage
            id={t('orders.filters.customer.lastName.description')}
          />
        ),
      },
      {
        key: 'middleName',
        label: (
          <FormattedMessage id={t('orders.filters.customer.middleName')} />
        ),
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.middleName',
        description: (
          <FormattedMessage
            id={t('orders.filters.customer.middleName.description')}
          />
        ),
      },
      {
        key: 'phoneNumber',
        label: <FormattedMessage id={t('orders.filters.customer.phone')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.phoneNumber',
        description: (
          <FormattedMessage
            id={t('orders.filters.customer.phone.description')}
          />
        ),
      },
    ],
  },
  {
    key: 'fulfillmentStatus',
    label: (
      <FormattedMessage id={t('orders.filters.fulfillmentStatus.label')} />
    ),
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'fulfillment.status',
    description: (
      <FormattedMessage
        id={t('orders.filters.fulfillmentStatus.description')}
      />
    ),
    options: Object.values(fulfillmentStatuses),
  },
  {
    key: 'boardId',
    label: <FormattedMessage id={t('orders.filters.boardId.label')} />,
    type: UiFilter.UiFilterType.Relation,
    entity: Entity.Board,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'boardId',
    description: (
      <FormattedMessage id={t('orders.filters.boardId.description')} />
    ),
  },
  {
    key: 'items',
    label: <FormattedMessage id={t('orders.filters.items.label')} />,
    type: UiFilter.UiFilterType.Any,
    operators: [],
    description: (
      <FormattedMessage id={t('orders.filters.items.description')} />
    ),
    children: [
      {
        key: 'costPrice',
        label: <FormattedMessage id={t('orders.filters.items.costPrice')} />,
        type: UiFilter.UiFilterType.Price,
        operators: UiFilter.uiPriceFilterOperators,
        payloadKey: 'items.costPrice',
        description: (
          <FormattedMessage
            id={t('orders.filters.items.costPrice.description')}
          />
        ),
      },
      {
        key: 'discount',
        label: <FormattedMessage id={t('orders.filters.items.discount')} />,
        type: UiFilter.UiFilterType.Price,
        operators: UiFilter.uiPriceFilterOperators,
        payloadKey: 'items.discount',
        description: (
          <FormattedMessage
            id={t('orders.filters.items.discount.description')}
          />
        ),
      },
      {
        key: 'price',
        label: <FormattedMessage id={t('orders.filters.items.price')} />,
        type: UiFilter.UiFilterType.Price,
        operators: UiFilter.uiPriceFilterOperators,
        payloadKey: 'items.price',
        description: (
          <FormattedMessage id={t('orders.filters.items.price.description')} />
        ),
      },
      {
        key: 'productId',
        label: <FormattedMessage id={t('orders.filters.items.product')} />,
        entity: Entity.ProdVariant,
        type: UiFilter.UiFilterType.Relation,
        operators: UiFilter.uiRelationFilterOperators,
        payloadKey: 'items.productId',
        description: (
          <FormattedMessage
            id={t('orders.filters.items.product.description')}
          />
        ),
      },
      {
        key: 'quantity',
        label: <FormattedMessage id={t('orders.filters.items.quantity')} />,
        type: UiFilter.UiFilterType.Number,
        operators: UiFilter.uiNumberFilterOperators,
        payloadKey: 'items.quantity',
        description: (
          <FormattedMessage
            id={t('orders.filters.items.quantity.description')}
          />
        ),
      },
      {
        key: 'total',
        label: <FormattedMessage id={t('orders.filters.items.total')} />,
        type: UiFilter.UiFilterType.Price,
        operators: UiFilter.uiPriceFilterOperators,
        payloadKey: 'items.total',
        description: (
          <FormattedMessage id={t('orders.filters.items.total.description')} />
        ),
      },
      {
        key: 'weight',
        label: <FormattedMessage id={t('orders.filters.items.weight')} />,
        type: UiFilter.UiFilterType.Weight,
        operators: UiFilter.uiNumberFilterOperators,
        payloadKey: 'items.weight',
        description: (
          <FormattedMessage id={t('orders.filters.items.weight.description')} />
        ),
      },
    ],
  },
  {
    key: 'orderStatus',
    label: <FormattedMessage id={t('orders.filters.orderStatus.label')} />,
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'orderStatus',
    description: (
      <FormattedMessage id={t('orders.filters.orderStatus.description')} />
    ),
    options: Object.values(orderStatuses),
  },
  {
    key: 'orderNumber',
    label: <FormattedMessage id={t('orders.filters.orderNumber.label')} />,
    type: UiFilter.UiFilterType.Number,
    operators: UiFilter.uiNumberFilterOperators,
    payloadKey: 'orderNumber',
    description: (
      <FormattedMessage id={t('orders.filters.orderNumber.description')} />
    ),
  },
  {
    key: 'paymentMethodId',
    label: <FormattedMessage id={t('orders.filters.paymentMethodId.label')} />,
    type: UiFilter.UiFilterType.Relation,
    entity: Entity.PayMethod,
    payloadKey: 'paymentMethodId',
    operators: UiFilter.uiRelationFilterOperators,
    description: (
      <FormattedMessage id={t('orders.filters.paymentMethodId.description')} />
    ),
  },
  {
    key: 'paymentStatus',
    label: <FormattedMessage id={t('orders.filters.paymentStatus.label')} />,
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'paymentLine.status',
    description: (
      <FormattedMessage id={t('orders.filters.paymentStatus.description')} />
    ),
    options: Object.values(paymentStatuses),
  },
  {
    key: 'note',
    label: <FormattedMessage id={t('orders.filters.note.label')} />,
    type: UiFilter.UiFilterType.String,
    operators: UiFilter.uiStringFilterOperators,
    payloadKey: 'note',
    description: <FormattedMessage id={t('orders.filters.note.description')} />,
  },
  {
    key: 'shippingMethodId',
    label: <FormattedMessage id={t('orders.filters.shippingMethodId.label')} />,
    type: UiFilter.UiFilterType.Relation,
    entity: Entity.ShipMethod,
    payloadKey: 'shippingMethodId',
    operators: UiFilter.uiRelationFilterOperators,
    description: (
      <FormattedMessage id={t('orders.filters.shippingMethodId.description')} />
    ),
  },
  {
    key: 'totalDiscount',
    label: <FormattedMessage id={t('orders.filters.totalDiscount.label')} />,
    type: UiFilter.UiFilterType.Price,
    operators: UiFilter.uiPriceFilterOperators,
    payloadKey: 'totalDiscount',
    description: (
      <FormattedMessage id={t('orders.filters.totalDiscount.description')} />
    ),
  },
  {
    key: 'totalPrice',
    label: <FormattedMessage id={t('orders.filters.totalPrice.label')} />,
    type: UiFilter.UiFilterType.Price,
    operators: UiFilter.uiPriceFilterOperators,
    payloadKey: 'totalPrice',
    description: (
      <FormattedMessage id={t('orders.filters.totalPrice.description')} />
    ),
  },
  {
    key: 'totalRefunded',
    label: <FormattedMessage id={t('orders.filters.totalRefunded.label')} />,
    type: UiFilter.UiFilterType.Price,
    operators: UiFilter.uiPriceFilterOperators,
    payloadKey: 'totalRefunded',
    description: (
      <FormattedMessage id={t('orders.filters.totalRefunded.description')} />
    ),
  },
  // Dates
  {
    key: 'createdAt',
    label: <FormattedMessage id={t('table.createdAt')} />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: (
      <FormattedMessage id={t('orders.filters.createdAt.description')} />
    ),
  },
  {
    key: 'paidAt',
    label: <FormattedMessage id={t('orders.filters.paidAt.label')} />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'paymentLine.processedAt',
    description: (
      <FormattedMessage id={t('orders.filters.paidAt.description')} />
    ),
  },
  {
    key: 'fulfilledAt',
    label: <FormattedMessage id={t('orders.filters.fulfilledAt.label')} />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'fulfillment.fulfilledAt',
    description: (
      <FormattedMessage id={t('orders.filters.fulfilledAt.description')} />
    ),
  },
  {
    key: 'tags',
    label: <FormattedMessage id={t('common.tags')} />,
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'tags.tagId',
    description: <FormattedMessage id={t('orders.filters.tags.description')} />,
    entity: Entity.Tag,
  },
] as UiFilter.IUiFilter[];
