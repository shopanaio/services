import { makeMethod, makeSelector, makeStore } from '@reframework/qx';
import { AUTH_TOKEN } from '@src/defs/constants';
import { IUser } from '@src/entity/User/User';

export interface ISessionState {
  isPersistent: boolean;
  jwt: string | null;
  user: IUser | null;
  isFetched: boolean;
}

const store = makeStore<ISessionState>('session', {
  isPersistent: false,
  jwt: null,
  user: null,
  isFetched: false,
});

const setSession = makeMethod(store, (state, payload: ISessionState) => {
  return { ...state, ...payload };
});

const createSession = (session: ISessionState) => {
  if (session.jwt) {
    if (session.isPersistent) {
      localStorage.setItem(AUTH_TOKEN, session.jwt);
    } else {
      sessionStorage.setItem(AUTH_TOKEN, session.jwt);
    }
  }

  setSession(session);
};

const restoreSession = (props: { user: IUser; isFetched: boolean }) => {
  setSession({
    user: props.user,
    isFetched: props.isFetched,
    isPersistent: true,
    jwt: localStorage.getItem(AUTH_TOKEN),
  });
};

const clearSession = (props: { isFetched: boolean }) => {
  localStorage.removeItem(AUTH_TOKEN);
  sessionStorage.removeItem(AUTH_TOKEN);

  setSession({
    isPersistent: false,
    jwt: null,
    user: null,
    isFetched: props.isFetched,
  });
};

export const $session = {
  session: makeSelector(store, (state) => state),
  currentUser: makeSelector(store, (state) => state.user),
  setSession,
  createSession,
  clearSession,
  restoreSession,
};
