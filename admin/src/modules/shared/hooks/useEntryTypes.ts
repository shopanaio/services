import { gql, useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { Entity } from '@src/defs/entities';
import { ApiMutation } from '@src/graphql';
import { uniq } from 'lodash';
import { useEffect, useState } from 'react';

const mutation = gql`
  mutation EntryTypes($input: BulkEntryTypesInput!) {
    bulkMutation {
      entryTypes(input: $input)
    }
  }
`;

export const useEntryTypes = (entity: Entity) => {
  const [entryTypes, setEntryTypes] = useState<string[]>([]);
  const [getEntryTypes, { loading }] = useMutation<ApiMutation>(mutation);

  useEffect(() => {
    getEntryTypes({
      variables: { input: { entity } },
    })
      .then(({ data }) => {
        setEntryTypes(uniq(data?.bulkMutation?.entryTypes) || []);
      })
      .catch(() => {
        setEntryTypes([]);
        notify.error('Failed to fetch entry types');
      });
  }, []);

  return {
    loading,
    entryTypes,
  };
};
