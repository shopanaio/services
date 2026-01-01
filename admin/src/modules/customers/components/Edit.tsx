import { ApiCustomerQueryFindOneArgs } from '@src/graphql';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { useLazyQuery } from '@apollo/client';
import {
  ApiCustomerQueryFindOneResponse,
  FindOneCustomerQuery,
} from '@modules/customers/graphql/findOne';
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultFormValues } from '@modules/customers/defs';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { Customer, ICustomer } from '@src/entity/Customer/Customer';
import { useUpdateCustomer } from '@modules/customers/hooks/useUpdate';
import { getCustomerFormValues } from '@modules/customers/utils/getFormValues';
import { getEditCustomerPayload } from '@modules/customers/utils/getEditPayload';
import { getEditCustomerSchema } from '@src/schemas/Customer/schema';
import { Notification } from '@modules/customers/components/Notifications';
import { Address } from '@modules/customers/components/Address';
import { Note } from '@components/forms/note/Note';
import { Tags } from '@components/forms/tags/Tags';
import { Information } from '@modules/customers/components/Information';
import { notify } from '@components/feedback/notification';
import { DrawerSkeleton } from '@src/layouts/table/components/Skeleton';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const EditCustomer = () => {
  const { formatMessage } = useIntl();
  const { updateCustomer } = useUpdateCustomer();
  const { entityId, forceClose } = useEntityDrawer();

  const shouldClose = useRef(false);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [errors, setErrors] = useState({});

  const [customerQuery] = useLazyQuery<
    ApiCustomerQueryFindOneResponse,
    ApiCustomerQueryFindOneArgs
  >(FindOneCustomerQuery, {
    fetchPolicy: 'no-cache',
    variables: { id: entityId as ID },
  });

  const fetchCustomer = useCallback(async () => {
    const response = await customerQuery();
    if (!response?.data?.customerQuery.findOne) {
      throw new Error('Customer not found');
    }

    return Customer.create(response.data.customerQuery.findOne);
  }, [customerQuery]);

  const methods = useForm({
    defaultValues: defaultFormValues,
  });

  const { reset, formState } = methods;
  const { dirtyFields, isDirty } = formState;

  useEffect(() => {
    fetchCustomer()
      .then((customer) => {
        setCustomer(customer);
        setLoading(false);
      })
      .catch((e) => {
        notify.error(e?.message);
        forceClose?.();
      });
  }, [fetchCustomer, reset, forceClose]);

  useEffect(() => {
    if (!customer) {
      return;
    }

    reset(getCustomerFormValues(customer));
  }, [customer, reset]);

  if (!customer || loading) {
    return <DrawerSkeleton />;
  }

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      const errors = await resolveSchema(getEditCustomerSchema(), data);
      setErrors(errors);
      if (Object.keys(errors).length) {
        return;
      }

      setLoading(true);
      await updateCustomer(
        getEditCustomerPayload({
          data,
          dirtyFields,
          customer,
        }),
      );

      notify.success(formatMessage({ id: t('customers.edit.update.success') }));
      if (shouldClose.current) {
        forceClose?.();
        return;
      }
      setCustomer(await fetchCustomer());
      setLoading(false);
    } catch {
      setLoading(false);
      notify.error(formatMessage({ id: t('customers.edit.update.failed') }));
    }
  });

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        errors={errors}
        headerProps={{
          title:
            `${customer.firstName} ${customer.lastName}`.trim() ||
            formatMessage({ id: t('customers.edit.title') }),
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
          onSubmitAndExit: () => {
            shouldClose.current = true;
            onSubmit();
          },
        }}
        leftColumn={[<Information key="info" />, <Address key="address" />]}
        rightColumn={[
          <Notification key="notifications" />,
          <Tags key="tags" disabled />,
          <Note key="note" disabled />,
        ]}
      />
    </FormProvider>
  );
};
