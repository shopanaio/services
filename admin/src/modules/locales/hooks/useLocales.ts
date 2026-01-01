import { $locales } from '@modules/locales/store';
import { $projects } from '@modules/projects/store/projects';
import { useSelector, useStore } from '@reframework/qx';

export const useLocales = () => {
  const { locales } = useStore($locales.store);

  return {
    locales,
  };
};

export const useDefaultLocale = () => {
  const project = useSelector($projects.currentProject);

  return project?.locale as string;
};
