import MatchMediaMock from 'jest-matchmedia-mock';

export const mockMatchMedia = () => {
  window.matchMedia = jest.fn().mockImplementation(() => new MatchMediaMock());
};
