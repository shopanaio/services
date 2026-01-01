import { gql, useMutation } from '@apollo/client';
import { Entity } from '@src/defs/entities';

const mutation = gql`
  mutation checkSlug($input: BulkUniqueSlugInput!) {
    bulkMutation {
      checkSlug(input: $input)
    }
  }
`;

export const useCheckSlug = (entity: Entity) => {
  const [checkSlug] = useMutation(mutation);

  return {
    checkSlug: async (slug: string) => {
      const { data } = await checkSlug({
        variables: {
          input: {
            entity,
            slug,
          },
        },
      });

      return !!data.bulkMutation.checkSlug;
    },
  };
};
