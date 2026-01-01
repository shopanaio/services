import { $session } from '@modules/auth/store/session';
import { routes } from '@modules/router/routes';
import { $projects } from '@modules/projects/store/projects';
import { useSelector } from '@reframework/qx';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@modules/projects/hooks/useProject';

export const useFetchStore = () => {
  const user = useSelector($session.currentUser);
  const { storeId } = useParams();

  const { data: current, loading, error } = useProject(storeId!);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    if (!storeId) {
      return;
    }

    if (error || !current) {
      console.warn('error fetching store, redirecting to stores page');
      // window.location.replace(routes.stores.url);
      return;
    }

    routes.setStoreId(storeId);
    $projects.setCurrentProject(current);
  }, [user, storeId, loading, error, current]);
};
