import { IReviewFormValues } from '@modules/reviews/types';
import { Entity } from '@src/defs/entities';
import { UiFilter } from '@src/entity/UiFilter';
import { ReviewStatus } from '@src/graphql';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const reviewColumns = {
  cover: {
    key: 'cover',
    label: <FormattedMessage id={t('common.cover')} />,
    isFixed: true,
    active: true,
  },
  product: {
    key: 'product',
    label: <FormattedMessage id={t('products.groups.productsLabel')} />,
    isFixed: false,
    active: true,
  },
  rating: {
    key: 'rating',
    label: <FormattedMessage id={t('reviews.rating')} />,
    isFixed: true,
    active: true,
  },
  helpfulYes: {
    key: 'helpfulYes',
    label: <FormattedMessage id={t('common.yes')} />,
    isFixed: false,
    active: true,
  },
  helpfulNo: {
    key: 'helpfulNo',
    label: <FormattedMessage id={t('common.no')} />,
    isFixed: false,
    active: true,
  },
  message: {
    key: 'message',
    label: <FormattedMessage id={t('common.comment')} />,
    isFixed: true,
    active: true,
  },
  customer: {
    key: 'customer',
    label: <FormattedMessage id={t('orders.filters.customer.label')} />,
    isFixed: false,
    active: true,
  },
  createdAt: {
    key: 'createdAt',
    label: <FormattedMessage id={t('table.createdAt')} />,
    isFixed: false,
    active: false,
  },
  updatedAt: {
    key: 'updatedAt',
    label: <FormattedMessage id={t('table.updatedAt')} />,
    isFixed: false,
    active: false,
  },
  status: {
    key: 'status',
    label: <FormattedMessage id={t('common.status')} />,
    isFixed: true,
    active: true,
  },
};

export const defaultFormValues: IReviewFormValues = {
  product: null,
  customer: null,
  message: '',
  rating: 0,
  status: ReviewStatus.Pending,
  displayName: '',
  title: '',
  pros: '',
  cons: '',
};

export const reviewStatuses = {
  [ReviewStatus.Approved]: {
    label: <FormattedMessage id={t('reviews.status.approved')} />,
    value: ReviewStatus.Approved,
    color: 'green',
  },
  [ReviewStatus.Pending]: {
    label: <FormattedMessage id={t('reviews.status.pending')} />,
    value: ReviewStatus.Pending,
    color: 'orange',
  },
  [ReviewStatus.Rejected]: {
    label: <FormattedMessage id={t('reviews.status.rejected')} />,
    value: ReviewStatus.Rejected,
    color: 'red',
  },
};

export const reviewDashboardFilters = [
  {
    description: <FormattedMessage id={t('reviews.filters.customer.description')} />,
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
        description: <FormattedMessage id={t('orders.filters.customer.customer.description')} />,
      },
      {
        key: 'email',
        label: <FormattedMessage id={t('orders.filters.customer.email')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.email',
        description: <FormattedMessage id={t('orders.filters.customer.email.description')} />,
      },
      {
        key: 'firstName',
        label: <FormattedMessage id={t('orders.filters.customer.firstName')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.firstName',
        description: <FormattedMessage id={t('orders.filters.customer.firstName.description')} />,
      },
      {
        key: 'lastName',
        label: <FormattedMessage id={t('orders.filters.customer.lastName')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.lastName',
        description: <FormattedMessage id={t('orders.filters.customer.lastName.description')} />,
      },
      {
        key: 'middleName',
        label: <FormattedMessage id={t('orders.filters.customer.middleName')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.middleName',
        description: <FormattedMessage id={t('orders.filters.customer.middleName.description')} />,
      },
      {
        key: 'phoneNumber',
        label: <FormattedMessage id={t('orders.filters.customer.phone')} />,
        type: UiFilter.UiFilterType.String,
        operators: UiFilter.uiStringFilterOperators,
        payloadKey: 'customer.phoneNumber',
        description: <FormattedMessage id={t('orders.filters.customer.phone.description')} />,
      },
    ],
  },
  {
    key: 'message',
    label: <FormattedMessage id={t('common.comment')} />,
    type: UiFilter.UiFilterType.String,
    operators: UiFilter.uiStringFilterOperators,
    payloadKey: 'message',
    description: <FormattedMessage id={t('reviews.filters.message.description')} />,
  },
  {
    key: 'rating',
    label: <FormattedMessage id={t('reviews.filters.rating.label')} />,
    type: UiFilter.UiFilterType.Number,
    operators: UiFilter.uiNumberFilterOperators,
    payloadKey: 'rating',
    description: <FormattedMessage id={t('reviews.filters.rating.description')} />,
  },
  {
    key: 'productId',
    label: <FormattedMessage id={t('products.groups.productsLabel')} />,
    entity: Entity.ProdContainer,
    type: UiFilter.UiFilterType.Relation,
    operators: UiFilter.uiRelationFilterOperators,
    payloadKey: 'productId',
    description: <FormattedMessage id={t('reviews.filters.product.description')} />,
  },
  {
    key: 'reviewStatus',
    label: <FormattedMessage id={t('common.status')} />,
    type: UiFilter.UiFilterType.IsConstant,
    operators: UiFilter.uiConstantFilterOperators,
    payloadKey: 'reviewStatus',
    description: <FormattedMessage id={t('reviews.filters.status.description')} />,
    options: Object.values(reviewStatuses),
  },
  {
    key: 'createdAt',
    label: <FormattedMessage id={t('table.createdAt')} />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'createdAt',
    description: <FormattedMessage id={t('reviews.filters.createdAt.description')} />,
  },
  {
    key: 'updatedAt',
    label: <FormattedMessage id={t('table.updatedAt')} />,
    type: UiFilter.UiFilterType.Date,
    operators: UiFilter.uiDateFilterOperators,
    payloadKey: 'updatedAt',
    description: <FormattedMessage id={t('reviews.filters.updatedAt.description')} />,
  },
] as UiFilter.IUiFilter[];
