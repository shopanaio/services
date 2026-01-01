const API_URL = process.env.API_URL || '';
const UPLOAD_URL = process.env.UPLOAD_URL || '';
const NODE_ENV = process.env.NODE_ENV;

const isProduction = NODE_ENV === 'production';
const file = isProduction ? 'file' : 'file';

export const API_ROUTES = {
  GRAPHQL: `${API_URL}/api/admin/graphql/query`,
  UPLOAD_ONE: `${UPLOAD_URL}/api/admin/v1/${file}/upload`,
  UPLOAD_MANY: `${UPLOAD_URL}/api/admin/v1/${file}/upload_many`,
  FILE_SERVER: `${UPLOAD_URL}/static`,
};
