import {
  actionsColumn,
  EmptyColumnText,
  getDateColumns,
  getNameColumn,
} from '@components/table/columns';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { ColumnsType } from 'antd/es/table';
import { App, Tag, Typography, Rate } from 'antd';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { transformColumns } from '@src/utils/utils';
import { useReviews } from '@modules/reviews/hooks/useReviews';
import { reviewColumns, reviewStatuses } from '@modules/reviews/defs';
import { Flex } from '@components/utility/Flex';
import { ReviewStatus } from '@src/graphql';
import { IReview } from '@src/entity/Review/Review';
import { useCreateReview } from '@modules/reviews/hooks/useCreateReview';
import { notify } from '@components/feedback/notification';
import { useReviewDelete } from '@hooks/useReviewDelete';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
const Reviews = () => {
  const intl = useIntl();
  const { reviews, loading, navigation, meta } = useReviews();
  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;

  const { createReview } = useCreateReview();
  const { deleteReview } = useReviewDelete();
  const { modal } = App.useApp();

  const productNameColumn = {
    ...getNameColumn({
      // width: 340,
      titlePath: 'product.title',
      optionsPath: 'product.options',
      variantsPath: 'product.variants',
      onClick: (record: IReview) => {
        $drawers.addDrawer({
          entityId: record.id,
          type: DrawerTypes.REVIEW,
        });
      },
    }),
    key: reviewColumns.product.key,
    title: reviewColumns.product.label,
    render: (_: any, record: IReview, idx: number) => {
      if (!record.product) {
        return (
          <EmptyColumnText>
            <FormattedMessage id={t('reviews.table.noProduct')} />
          </EmptyColumnText>
        );
      }

      // defer to the default renderer produced by getNameColumn
      const defaultRenderer = getNameColumn({
        // width: 200,
        titlePath: 'product.title',
        optionsPath: 'product.options',
        variantsPath: 'product.variants',
        onClick: undefined,
      }).render as any;
      return defaultRenderer(_, record, idx);
    },
  } as ColumnsType<IReview>[number];

  const columns: ColumnsType<IReview> = [
    productNameColumn,
    {
      title: reviewColumns.customer.label,
      key: reviewColumns.customer.key,
      dataIndex: 'customer',
      // width: 200,
      render: (_: any, record: IReview) => {
        if (!record.customer) {
          return (
            <EmptyColumnText>
              <FormattedMessage id={t('reviews.table.noCustomer')} />
            </EmptyColumnText>
          );
        }

        const { firstName, lastName } = record.customer;

        if (!firstName && !lastName) {
          return (
            <EmptyColumnText>
              <FormattedMessage id={t('reviews.table.noCustomerName')} />
            </EmptyColumnText>
          );
        }

        return (
          <Flex>
            {firstName && <Typography.Text>{firstName}</Typography.Text>}
            {lastName && <Typography.Text>{lastName}</Typography.Text>}
          </Flex>
        );
      },
    },
    {
      title: reviewColumns.rating.label,
      key: reviewColumns.rating.key,
      dataIndex: 'rating',
      // width: 220,
      render: (rating: number) => {
        if (rating === null || rating === undefined) {
          return <EmptyColumnText />;
        }

        return (
          <Flex align="center" gap="1">
            <Rate disabled value={rating} allowHalf={false} />
            <Typography.Text>{rating}</Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: reviewColumns.helpfulYes.label,
      key: reviewColumns.helpfulYes.key,
      dataIndex: 'helpfulYes',
      width: 100,
      render: (count: number) => {
        if (count === null || count === undefined) {
          return <EmptyColumnText />;
        }
        return <Typography.Text>{count}</Typography.Text>;
      },
    },
    {
      title: reviewColumns.helpfulNo.label,
      key: reviewColumns.helpfulNo.key,
      dataIndex: 'helpfulNo',
      width: 100,
      render: (count: number) => {
        if (count === null || count === undefined) {
          return <EmptyColumnText />;
        }
        return <Typography.Text>{count}</Typography.Text>;
      },
    },
    {
      title: reviewColumns.message.label,
      key: reviewColumns.message.key,
      dataIndex: 'message',
      // width: 300,
      render: (message: string) => {
        return <Typography.Text>{message}</Typography.Text>;
      },
    },
    {
      title: reviewColumns.status.label,
      key: reviewColumns.status.key,
      dataIndex: 'status',
      fixed: 'right' as const,
      width: 120,
      render: (status: ReviewStatus) => {
        if (!status) {
          return (
            <EmptyColumnText>
              <FormattedMessage id={t('common.internal.noStatus')} />
            </EmptyColumnText>
          );
        }

        return (
          <Tag
            style={{ minWidth: 50, textAlign: 'center' }}
            color={reviewStatuses[status].color}
          >
            {reviewStatuses[status].label}
          </Tag>
        );
      },
    },
    ...getDateColumns({ sortProps: navigation.sortProps }),
    actionsColumn({
      onDelete: async ({ id }: IReview) => {
        const confirm = await modal.confirm({
          icon: null,
          title: <FormattedMessage id={t('common.confirm.deleteTitle')} />,
          content: <FormattedMessage id={t('reviews.confirm.deleteOne')} />,
        });
        if (!confirm) {
          return;
        }
        void deleteReview(id);
      },
      onEdit: ({ id }: IReview) => {
        $drawers.addDrawer({
          entityId: id,
          type: DrawerTypes.REVIEW,
        });
      },
    }),
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

  return (
    <>
      <TableLayout
        paginationProps={{
          onChangePage: navigation.paginationProps.setPage,
          onChangePageSize: navigation.paginationProps.setPageSize,
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
        }}
        tableProps={{
          name: 'reviews',
          layout: 'fixed',
          sticky: true,
          loading,
          selectedRows,
          onChangeSelectedRows,
          columns: activeColumns,
          data: reviews,
        }}
        navigationProps={{
          ...navigation,
          actionsProps: {
            onDelete: (ids: ID[]) => {
              ids.forEach((id) => {
                void deleteReview(id);
              });
            },
          },
        }}
        headerProps={{
          title: <FormattedMessage id={t('reviews.title')} />,
          count: meta.total,
          create: async () => {
            try {
              const { data } = await createReview({
                message: 'Message',
                rating: 4,
                displayName: 'Guest',
                title: 'Untitled',
                status: ReviewStatus.Pending,
              });

              const id = data?.reviewMutation?.create;

              if (id) {
                $drawers.addDrawer({
                  entityId: id,
                  type: DrawerTypes.REVIEW,
                });
              } else {
                notify.error(
                  intl.formatMessage({ id: t('reviews.createFailed') }),
                );
              }
            } catch (error) {
              notify.error((error as Error).message);
            }
          },
        }}
      />
    </>
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default Reviews;
