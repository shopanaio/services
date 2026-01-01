import { gql, useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ApiAddCommentInput,
  ApiCancelOrderInput,
  ApiCreateOrderInput,
  ApiCreateOrderItemInput,
  ApiCreateShippingItemInput,
  ApiMutation,
  ApiSplitFulfillmentInput,
  ApiUpdateAdminNoteInput,
  ApiUpdateFulfillmentStatusInput,
  ApiUpdateOrderCustomerInput,
  ApiUpdateOrderInput,
  ApiUpdateOrderItemInput,
  ApiUpdateOrderStatusInput,
  ApiUpdateOrderTagsInput,
  ApiUpdatePaymentStatusInput,
  ApiUpdateShippingItemInput,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useUpdateOrder = () => {
  const UpdateOrderMutation = gql`
    mutation UpdateOrder($input: UpdateOrderInput!) {
      orderMutation {
        update(input: $input)
      }
    }
  `;

  const [mutation, { loading, error }] =
    useMutation<ApiMutation>(UpdateOrderMutation);

  const updateOrder = (input: ApiUpdateOrderInput) => {
    return mutation({ variables: { input } });
  };

  return {
    updateOrder,
    loading,
    error,
  };
};

export const useCreateOrder = () => {
  const query = gql`
    mutation CreateOrder($input: CreateOrderInput!) {
      orderMutation {
        create(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const intl = useIntl();
  const createOrder = async (options?: IMutationHandlers) => {
    try {
      const { data } = await mutation({
        variables: {
          input: {
            clientInfo: {
              userAgent: navigator?.userAgent,
              language: navigator?.language,
            },
          } as ApiCreateOrderInput,
        },
        ...options,
      });
      if (!data?.orderMutation?.create) {
        throw new Error();
      }
      return data.orderMutation.create;
    } catch (e) {
      notify.error(intl.formatMessage({ id: t('orders.createFailed') }));
      return null;
    }
  };

  return { createOrder };
};

export const useUpdateOrderStatus = () => {
  const query = gql`
    mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
      orderMutation {
        updateStatus(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateStatus = (
    input: ApiUpdateOrderStatusInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updateStatus };
};

export const useUpdateOrderCustomer = () => {
  const query = gql`
    mutation UpdateOrderCustomer($input: UpdateOrderCustomerInput!) {
      orderMutation {
        updateCustomer(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateCustomer = (
    input: ApiUpdateOrderCustomerInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updateCustomer };
};

export const useDeleteOrderCustomer = () => {
  const query = gql`
    mutation DeleteOrderCustomer($id: ID!) {
      orderMutation {
        deleteCustomer(id: $id)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const deleteCustomer = (id: ID, options?: IMutationHandlers) =>
    mutation({ variables: { id }, ...options });

  return { deleteCustomer };
};

export const useUpdateOrderTags = () => {
  const query = gql`
    mutation UpdateTags($input: UpdateOrderTagsInput!) {
      orderMutation {
        updateTags(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateTags = (
    input: ApiUpdateOrderTagsInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updateTags };
};

export const useUpdateAdminNote = () => {
  const query = gql`
    mutation UpdateAdminNote($input: UpdateAdminNoteInput!) {
      orderMutation {
        updateAdminNote(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateAdminNote = (
    input: ApiUpdateAdminNoteInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updateAdminNote };
};

export const useAddOrderComment = () => {
  const query = gql`
    mutation AddOrderComment($input: AddCommentInput!) {
      orderMutation {
        addComment(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const addComment = (input: ApiAddCommentInput, options?: IMutationHandlers) =>
    mutation({ variables: { input }, ...options });

  return { addComment };
};

export const useCancelOrder = () => {
  const query = gql`
    mutation CancelOrder($input: CancelOrderInput!) {
      orderMutation {
        cancel(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const cancel = (input: ApiCancelOrderInput, options?: IMutationHandlers) =>
    mutation({ variables: { input }, ...options });

  return { cancel };
};

export const useUpdatePaymentStatus = () => {
  const query = gql`
    mutation UpdatePaymentStatus($input: UpdatePaymentStatusInput!) {
      orderMutation {
        updatePaymentStatus(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updatePaymentStatus = (
    input: ApiUpdatePaymentStatusInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updatePaymentStatus };
};

export const useSplitFulfillment = () => {
  const query = gql`
    mutation SplitFulfillment($input: SplitFulfillmentInput!) {
      orderMutation {
        splitFulfillment(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const splitFulfillment = (
    input: ApiSplitFulfillmentInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { splitFulfillment };
};

export const useUndoSplitFulfillment = () => {
  const query = gql`
    mutation UndoSplitFulfillment($id: ID!) {
      orderMutation {
        undoSplitFulfillment(id: $id)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const undoSplitFulfillment = (id: ID, options?: IMutationHandlers) =>
    mutation({ variables: { id }, ...options });

  return { undoSplitFulfillment };
};

export const useUpdateFulfillmentStatus = () => {
  const query = gql`
    mutation UpdateFulfillmentStatus($input: UpdateFulfillmentStatusInput!) {
      orderMutation {
        updateFulfillmentStatus(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateFulfillmentStatus = (
    input: ApiUpdateFulfillmentStatusInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updateFulfillmentStatus };
};

export const useCreateShippingItem = () => {
  const query = gql`
    mutation CreateShippingItem($input: CreateShippingItemInput!) {
      orderMutation {
        createShippingItem(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const createShippingItem = (input: ApiCreateShippingItemInput) =>
    mutation({ variables: { input } });

  return { createShippingItem };
};

export const useUpdateShippingItem = () => {
  const query = gql`
    mutation UpdateShippingItem($input: UpdateShippingItemInput!) {
      orderMutation {
        updateShippingItem(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateShippingItem = (input: ApiUpdateShippingItemInput) =>
    mutation({ variables: { input } });

  return { updateShippingItem };
};

export const useCreateOrderItem = () => {
  const query = gql`
    mutation CreateOrderItem($input: CreateOrderItemInput!) {
      orderMutation {
        createOrderItem(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const createOrderItem = (
    input: ApiCreateOrderItemInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { createOrderItem };
};

export const useUpdateOrderItem = () => {
  const query = gql`
    mutation UpdateOrderItem($input: UpdateOrderItemInput!) {
      orderMutation {
        updateOrderItem(input: $input)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const updateOrderItem = (
    input: ApiUpdateOrderItemInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { updateOrderItem };
};

export const useDeleteOrderItem = () => {
  const query = gql`
    mutation DeleteOrderItem($id: ID!) {
      orderMutation {
        deleteOrderItem(id: $id)
      }
    }
  `;

  const [mutation] = useMutation<ApiMutation>(query);
  const deleteOrderItem = (id: ID, options?: IMutationHandlers) =>
    mutation({ variables: { id }, ...options });

  return { deleteOrderItem };
};
