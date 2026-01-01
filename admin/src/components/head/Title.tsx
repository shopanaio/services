import { $projects } from '@modules/projects/store/projects';
import { useSelector } from '@reframework/qx';
import { useMemo } from 'react';
import { Helmet } from 'react-helmet';

export const DocumentTitle = () => {
  const store = useSelector($projects.currentProject);

  const title = useMemo(() => {
    return `Shopana${store?.name ? ` | ${store.name}` : ''}`;
  }, [store?.name]);

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
};
