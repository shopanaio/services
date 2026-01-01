import { useQuery, useMutation } from '@apollo/client';
import { useMemo } from 'react';

import { IMutationHandlers } from '@src/types';
import {
  ApiCrmAppendTicketInput,
  ApiCrmCreateColumnInput,
  ApiCrmMoveTicketInput,
  ApiCrmUpdateColumnInput,
  ApiQuery,
} from '@src/graphql';
import { CrmQueries } from '@modules/crm/graphql/crm';
import { CrmColumn, ICrmColumn } from '@src/entity/Order/Crm';
import { sanitizeEntries } from '@src/entity/utils';

export const useCrmColumns = () => {
  const { data, loading, refetch } = useQuery<ApiQuery>(
    CrmQueries.CrmFindManyColumnsQuery,
    { fetchPolicy: 'no-cache' },
  );

  const { columnsMapping, columns } = useMemo(() => {
    const columnsMapping = {} as Record<string, ICrmColumn>;

    if (!data?.crmQuery.getColumns) {
      return {
        columnsMapping,
        columns: [],
      };
    }

    const validColumns = sanitizeEntries(
      data.crmQuery.getColumns.map(CrmColumn.create),
    );

    validColumns.forEach((column: ICrmColumn) => {
      columnsMapping[column.id] = column;
    });

    return {
      columnsMapping,
      columns: validColumns as ICrmColumn[],
    };
  }, [data]);

  return {
    refetch,
    columns,
    columnsMapping,
    loading,
  };
};

export const useCreateCrmColumn = () => {
  const [mutation, { loading, error }] = useMutation(
    CrmQueries.CrmCreateColumnMutation,
  );

  const createColumn = (
    input: ApiCrmCreateColumnInput,
    options?: IMutationHandlers,
  ) => mutation({ variables: { input }, ...options });

  return { createColumn, loading, error };
};

export const useDeleteCrmColumn = () => {
  const [mutation, { loading, error }] = useMutation(
    CrmQueries.CrmDeleteColumnMutation,
  );

  const deleteColumn = (id: ID, options: IMutationHandlers) =>
    mutation({ variables: { id }, ...options });

  return { deleteColumn, loading, error };
};

export const useUpdateCrmColumn = () => {
  const [mutation, { loading, error }] = useMutation(
    CrmQueries.CrmUpdateColumnMutation,
  );

  const updateColumn = (
    input: ApiCrmUpdateColumnInput,
    options?: IMutationHandlers,
  ) => {
    mutation({ variables: { input }, ...options });
  };

  return { updateColumn, loading, error };
};

export const useUpdateManyCrmColumns = () => {
  const [mutation, { loading, error }] = useMutation(
    CrmQueries.CrmUpdateManyColumnsMutation,
  );

  const updateColumns = (
    input: ApiCrmUpdateColumnInput[],
    options?: IMutationHandlers,
  ) => {
    return mutation({ variables: { input }, ...options });
  };

  return { updateColumns, loading, error };
};

export const useAppendCrmTicket = () => {
  const [mutation, { loading, error }] = useMutation(
    CrmQueries.CrmAppendColumnMutation,
  );

  const appendTicket = (
    input: ApiCrmAppendTicketInput,
    options: IMutationHandlers,
  ) => {
    mutation({ variables: { input }, ...options });
  };

  return { appendTicket, loading, error };
};

export const useMoveCrmTicket = () => {
  const [mutation, { loading, error }] = useMutation(
    CrmQueries.CrmMoveTicketMutation,
  );

  const moveTicket = (
    input: ApiCrmMoveTicketInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({ variables: { input }, ...options });
  };

  return { moveTicket, loading, error };
};
