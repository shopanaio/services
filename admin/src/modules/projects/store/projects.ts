import { makeMethod, makeSelector, makeStore } from '@reframework/qx';
import { IProject, IProjectInfo } from '@src/entity/Project/Project';

interface IProjectsState {
  project: IProjectInfo | null;
  projects: IProject[];
}

const store = makeStore<IProjectsState>('currentStore', {
  project: null,
  projects: [],
});

const setCurrentProject = (
  state: IProjectsState,
  payload: IProjectInfo | null,
) => {
  return { ...state, project: payload };
};

const removeProject = (state: IProjectsState, id: ID) => {
  return {
    ...state,
    projects: state.projects.filter((project) => project.id !== id),
  };
};

export const $projects = {
  locales: makeSelector(store, () => ['en', 'fr']),
  projects: makeSelector(store, (state) => state.projects),
  currentProject: makeSelector(store, (state) => state.project),
  removeProject: makeMethod(store, removeProject),
  setCurrentProject: makeMethod(store, setCurrentProject),
  setProjects: makeMethod(store, (state, payload: IProject[]) => {
    return { ...state, projects: payload };
  }),
};
