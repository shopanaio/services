import { gql, useMutation } from '@apollo/client';
import { ApiUpdateLocalesInput } from '@src/graphql';

const UpdateLocalesMutation = gql`
  mutation UpdateLocales($input: UpdateLocalesInput!) {
    projectMutation {
      updateLocales(input: $input)
    }
  }
`;

const SetDefaultLocaleMutation = gql`
  mutation SetDefaultLocale($input: String!) {
    projectMutation {
      updateDefaultLocale(input: $input)
    }
  }
`;

export const useUpdateLocales = () => {
  const [mutation] = useMutation(UpdateLocalesMutation);
  const updateLocales = async (input: ApiUpdateLocalesInput) => {
    return mutation({
      variables: { input },
      refetchQueries: ['GetLocales'],
    });
  };

  return {
    updateLocales,
  };
};

export const useAddLocale = () => {
  const { updateLocales } = useUpdateLocales();
  const addLocale = async (code: string) => {
    return updateLocales({
      create: [{ code, isActive: true }],
      update: [],
      delete: [],
    });
  };

  return {
    addLocale,
  };
};

export const useDeleteLocale = () => {
  const { updateLocales } = useUpdateLocales();
  const deleteLocale = async (code: string) => {
    return updateLocales({
      create: [],
      update: [],
      delete: [code],
    });
  };

  return {
    deleteLocale,
  };
};

export const useSetDefaultLocale = () => {
  const [mutation] = useMutation(SetDefaultLocaleMutation);
  const setDefaultLocale = async (input: string) => {
    return mutation({ variables: { input }, refetchQueries: ['Project'] });
  };

  return {
    setDefaultLocale,
  };
};
