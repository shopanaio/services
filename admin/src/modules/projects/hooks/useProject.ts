import { useQuery } from '@apollo/client';
import { ProjectQuery } from '@modules/projects/graphql/getProjects';
import { ProjectInfo } from '@src/entity/Project/Project';
import { useMemo } from 'react';
import { PROJECT_COLORS } from '@modules/projects/defs/defs';
import { notify } from '@components/feedback/notification';
import { ApiQuery } from '@src/graphql';

export const useProject = (slug: string) => {
  const { data, loading, error } = useQuery<ApiQuery>(ProjectQuery, {
    fetchPolicy: 'no-cache',
    onError: () => {
      notify.error('Failed to fetch');
    },
  });

  const project = useMemo(() => {
    if (!data?.projectQuery?.current) {
      return;
    }

    return ProjectInfo.create({
      ...data?.projectQuery?.current,
      color: PROJECT_COLORS[0],
      slug,
    });
  }, [data, slug]);

  return {
    loading,
    error: !!error,
    data: project,
  };
};
