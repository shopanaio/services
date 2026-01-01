import { useQuery } from '@apollo/client';
import { GetProjects } from '@modules/projects/graphql/getProjects';
import { ApiProject } from '@src/graphql';
import { Project } from '@src/entity/Project/Project';
import { useMemo } from 'react';
import { PROJECT_COLORS } from '@modules/projects/defs/defs';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const useProjects = () => {
  const { formatMessage } = useIntl();
  const { data, loading, error } = useQuery(GetProjects, {
    fetchPolicy: 'no-cache',
    onError: () => {
      notify.error(formatMessage({ id: t('projects.fetchFailed') }));
    },
  });

  const projects = useMemo(() => {
    return (data?.projectQuery?.findMany || []).map(
      (it: ApiProject, idx: number) =>
        Project.create({
          ...it,
          color: PROJECT_COLORS[idx % PROJECT_COLORS.length],
        }),
    );
  }, [data]);

  return {
    loading,
    error: !!error,
    data: projects,
  };
};
