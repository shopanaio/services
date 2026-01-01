import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { useEffect, useState, useRef } from 'react';
import { notify } from '@components/feedback/notification';
import { defaultFormValues, reviewStatuses } from '@modules/reviews/defs';
import { useUpdateReview } from '@modules/reviews/hooks/useUpdateReview';
import { useLazyQuery } from '@apollo/client';
import { ReviewQueryFindOne } from '@modules/reviews/graphql/findOne';
import { ApiReview } from '@src/graphql';
import { DrawerSkeleton } from '@src/layouts/table/components/Skeleton';
import { Input, Rate, Table, Button, App } from 'antd';
import { Flex } from '@components/utility/Flex';
import { ProductSelect } from '@modules/products/components/ProductSelect';
import { CustomerSelect } from '@modules/customers/components/CustomerSelect';
import { EntryStatusAndInfo } from '@components/forms/EntryStatusAndInfo';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Label } from '@components/forms/Label';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import { getEditReviewSchema } from '@src/schemas/Review/schema';
import { getIconProps } from '@components/styles';
import { MdClose } from 'react-icons/md';
import { getCoverColumn, getNameColumn } from '@components/table/columns';
import { getReviewFormValues } from '@modules/reviews/utils/getReviewFormValues';
import { IReview, Review } from '@src/entity/Review/Review';
import { getEditReviewPayload } from '@modules/reviews/utils/getEditPayload';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

// Helper to derive display name from customer record
const getCustomerDisplayName = (customer: any) => {
  if (!customer) {
    return '';
  }

  const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  return name || customer.email;
};

export const ReviewForm = () => {
  const { formatMessage } = useIntl();
  const { entityId, forceClose, uuid } = useEntityDrawer();

  const { updateReview } = useUpdateReview();

  const [currentReview, setCurrentReview] = useState<IReview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const shouldClose = useRef(false);
  const [errors, setErrors] = useState<any>({});

  const [fetchQuery] = useLazyQuery(ReviewQueryFindOne, {
    variables: { id: entityId },
    fetchPolicy: 'no-cache',
  });

  const fetchReview = async () => {
    const { data } = await fetchQuery();
    if (!data?.reviewQuery?.findOne) {
      throw new Error('Review not found');
    }

    return data.reviewQuery.findOne as ApiReview;
  };

  const methods = useForm({
    defaultValues: defaultFormValues,
  });

  const { reset, formState } = methods;
  const { isDirty } = formState;

  const { modal } = App.useApp();
  const selectedProduct = methods.watch('product');
  const selectedCustomer = methods.watch('customer');

  useEffect(() => {
    fetchReview()
      .then((apiReview) => {
        if (!apiReview) {
          return;
        }

        const review = Review.create(apiReview);
        setCurrentReview(review);
        reset(getReviewFormValues(review));
        setLoading(false);
      })

      .catch((e) => {
        notify.error(e.message);
        forceClose?.();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  if (loading) {
    return <DrawerSkeleton />;
  }

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      setLoading(true);

      // 1. Validation
      const schema = getEditReviewSchema();
      const validationErrors = await resolveSchema(schema, { ...data });
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length) {
        setLoading(false);
        return;
      }

      await updateReview({
        ...getEditReviewPayload({
          data,
          review: currentReview as IReview,
          dirtyFields: formState.dirtyFields,
        }),
      });
      const updatedReview = await fetchReview();
      notify.success(formatMessage({ id: t('reviews.updated') }));

      if (shouldClose.current) {
        forceClose?.();
        return;
      }

      if (updatedReview) {
        const review = Review.create(updatedReview);
        setCurrentReview(review);
        reset(getReviewFormValues(review));
      }

      setLoading(false);
    } catch (e) {
      notify.error((e as Error).message);
      setLoading(false);
      shouldClose.current = false;
    }
  });

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        headerProps={{
          title: formatMessage({ id: t('reviews.form.editTitle') }),
          submitButtonProps: { disabled: !isDirty, onClick: onSubmit },
          onSubmitAndExit: () => {
            shouldClose.current = true;
            onSubmit();
          },
        }}
        errors={errors}
        leftColumn={
          <>
            <DrawerPaper key="product">
              <DrawerPaperHeader
                title={formatMessage({
                  id: t('products.groups.productsLabel'),
                })}
                name="product"
              />
              <Flex direction="column">
                {!selectedProduct ? (
                  <ProductSelect
                    multiple={false}
                    value={[]}
                    onChange={(val: any[]) => {
                      const [product] = val;
                      methods.setValue('product', product || null, {
                        shouldDirty: true,
                      });
                    }}
                  />
                ) : (
                  <Table
                    dataSource={[selectedProduct]}
                    pagination={false}
                    columns={[
                      getNameColumn({
                        coverPath: 'cover',
                        optionsPath: 'options',
                      }),
                      {
                        key: 'actions',
                        align: 'right' as const,
                        width: 40,
                        render: () => (
                          <Button
                            type="text"
                            icon={<MdClose {...getIconProps(18)} />}
                            onClick={async () => {
                              const confirmed = await modal.confirm({
                                icon: null,
                                title: formatMessage({
                                  id: t('reviews.form.removeProduct.title'),
                                }),
                                content: formatMessage({
                                  id: t('reviews.form.removeProduct.content'),
                                }),
                                okText: formatMessage({
                                  id: t('common.yes'),
                                }),
                                cancelText: formatMessage({
                                  id: t('common.no'),
                                }),
                              });

                              if (confirmed) {
                                methods.setValue('product', null, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          />
                        ),
                      },
                    ]}
                  />
                )}
              </Flex>
            </DrawerPaper>
            <DrawerPaper key="main">
              <DrawerPaperHeader
                title={formatMessage({ id: t('reviews.rating') })}
                name="rating"
              />
              <Flex direction="column">
                <Controller
                  name="rating"
                  control={methods.control}
                  render={({ field }) => (
                    <Rate
                      allowHalf
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Flex>
              <Flex direction="column" mt="4">
                <Label required>
                  {formatMessage({ id: t('common.title') })}
                </Label>
                <Controller
                  name="title"
                  control={methods.control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder={formatMessage({
                        id: t('common.title'),
                      })}
                      showCount
                      maxLength={100}
                    />
                  )}
                />
              </Flex>
              <Flex direction="column" mt="4">
                <Label>{formatMessage({ id: t('reviews.form.pros') })}</Label>
                <Controller
                  name="pros"
                  control={methods.control}
                  render={({ field }) => (
                    <Input {...field} showCount maxLength={100} />
                  )}
                />
              </Flex>
              <Flex direction="column" mt="4">
                <Label>{formatMessage({ id: t('reviews.form.cons') })}</Label>
                <Controller
                  name="cons"
                  control={methods.control}
                  render={({ field }) => (
                    <Input {...field} showCount maxLength={100} />
                  )}
                />
              </Flex>
              <Flex direction="column" mt="4">
                <Label>{formatMessage({ id: t('common.comment') })}</Label>
                <Controller
                  name="message"
                  control={methods.control}
                  render={({ field }) => (
                    <Input.TextArea
                      {...field}
                      rows={10}
                      showCount
                      maxLength={200}
                    />
                  )}
                />
              </Flex>
            </DrawerPaper>
          </>
        }
        rightColumn={[
          <EntryStatusAndInfo
            key="info"
            statuses={reviewStatuses}
            createdAt={
              currentReview ? new Date(currentReview.createdAt) : new Date()
            }
            updatedAt={
              currentReview ? new Date(currentReview.updatedAt) : new Date()
            }
          />,

          <DrawerPaper key="customer">
            <DrawerPaperHeader
              title={formatMessage({
                id: t('orders.filters.customer.label'),
              })}
              name="customer"
            />
            <Flex direction="column">
              <Label required>
                {formatMessage({
                  id: t('orders.filters.customer.customer'),
                })}
              </Label>
              <Controller
                name="customer"
                control={methods.control}
                render={({ field }) => (
                  <CustomerSelect
                    multiple={false}
                    value={selectedCustomer ? [selectedCustomer] : []}
                    onChange={(val: any[]) => {
                      const [customer] = val;
                      field.onChange(customer || '');

                      // Автозаполнение имени для отображения, только если оно пустое
                      if (!methods.getValues('displayName')) {
                        const displayNameValue =
                          getCustomerDisplayName(customer);
                        methods.setValue('displayName', displayNameValue, {
                          shouldDirty: true,
                        });
                      }
                    }}
                    showValue
                  />
                )}
              />
            </Flex>
            <Flex direction="column" mt="4">
              <Label required={false}>
                {formatMessage({ id: t('reviews.form.displayName') })}
              </Label>
              <Controller
                name="displayName"
                control={methods.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder={formatMessage({
                      id: t('reviews.form.displayName.placeholder'),
                    })}
                  />
                )}
              />
            </Flex>
          </DrawerPaper>,
        ]}
      />
    </FormProvider>
  );
};
