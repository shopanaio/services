import { useMutation, useQuery } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  CreatePaymentMethodMutation,
  CreatePaymentServiceMutation,
  CreateShippingMethodMutation,
  CreateShippingServiceMutation,
  PaymentMethodFindMany,
  PaymentServicerFindMany,
  ShippingMethodFindMany,
  ShippingServicerFindMany,
} from '@modules/settings/graphql/services';

import {
  IPaymentMethod,
  PaymentMethod,
} from '@src/entity/Services/PaymentMethod';
import {
  IPaymentService,
  PaymentService,
} from '@src/entity/Services/PaymentService';
import {
  IShippingMethod,
  ShippingMethod,
} from '@src/entity/Services/ShippingMethod';
import {
  IShippingService,
  ShippingService,
} from '@src/entity/Services/ShippingService';
import {
  ApiCreatePaymentMethodInput,
  ApiCreatePaymentServiceInput,
  ApiCreateShippingMethodInput,
  ApiCreateShippingServiceInput,
  ApiQuery,
} from '@src/graphql';
import { useMemo } from 'react';

export const useShippingServices = () => {
  const { data, loading, error } = useQuery<ApiQuery>(
    ShippingServicerFindMany,
    { fetchPolicy: 'no-cache' },
  );

  const shippingMethods = useMemo(() => {
    return (data?.shippingServiceQuery?.findMany || []).map(
      ShippingService.create,
    ) as IShippingService[];
  }, [data]);

  return { shippingMethods, loading, error };
};

export const usePaymentServices = () => {
  const { data, loading, error } = useQuery<ApiQuery>(PaymentServicerFindMany, {
    fetchPolicy: 'no-cache',
  });

  const paymentServices = useMemo(() => {
    return (data?.paymentServiceQuery?.findMany || []).map(
      PaymentService.create,
    ) as IPaymentService[];
  }, [data]);

  return { paymentServices, loading, error };
};

export const useShippingMethods = () => {
  const { data, loading, error } = useQuery<ApiQuery>(ShippingMethodFindMany, {
    fetchPolicy: 'no-cache',
  });

  const shippingMethods = useMemo(() => {
    return (data?.shippingMethodQuery?.findMany || []).map(
      ShippingMethod.create,
    ) as IShippingMethod[];
  }, [data]);

  return { shippingMethods, loading, error };
};

export const usePaymentMethods = () => {
  const { data, loading, error } = useQuery<ApiQuery>(PaymentMethodFindMany, {
    fetchPolicy: 'no-cache',
  });

  const paymentMethods = useMemo(() => {
    return (data?.paymentMethodQuery?.findMany || []).map(
      PaymentMethod.create,
    ) as IPaymentMethod[];
  }, [data]);

  return { paymentMethods, loading, error };
};

export const useCreateShippingService = () => {
  const [mutation, { loading, error }] = useMutation(
    CreateShippingServiceMutation,
  );

  const createShippingService = (input: ApiCreateShippingServiceInput) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Failed to create shipping service');
      },
    });
  };

  return {
    createShippingService,
    loading,
    error,
  };
};

export const useCreatePaymentService = () => {
  const [mutation, { loading, error }] = useMutation(
    CreatePaymentServiceMutation,
  );

  const createPaymentService = (input: ApiCreatePaymentServiceInput) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Failed to create payment service');
      },
    });
  };

  return {
    createPaymentService,
    loading,
    error,
  };
};

export const useCreatePaymentMethod = () => {
  const [mutation, { loading, error }] = useMutation(
    CreatePaymentMethodMutation,
  );

  const createPaymentMethod = (input: ApiCreatePaymentMethodInput) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Failed to create payment method');
      },
    });
  };

  return {
    createPaymentMethod,
    loading,
    error,
  };
};

export const useCreateShippingMethod = () => {
  const [mutation, { loading, error }] = useMutation(
    CreateShippingMethodMutation,
  );

  const createShippingMethod = (input: ApiCreateShippingMethodInput) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Failed to create shipping method');
      },
    });
  };

  return {
    createShippingMethod,
    loading,
    error,
  };
};
