import { useMutation } from '@apollo/client';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { UpdateTranslationsMutation } from '@modules/translations/graphql/translation';

import { ApiUpdateTranslationInput } from '@src/graphql';

export const useUpdateTranslations = () => {
  const [mutation] = useMutation(UpdateTranslationsMutation);

  const updateTranslations = (input: ApiUpdateTranslationInput[]) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
    });
  };

  return {
    updateTranslations,
  };
};
