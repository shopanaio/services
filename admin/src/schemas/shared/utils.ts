export const isRequired = (field: boolean) =>
  field ? 'required' : 'notRequired';

export const withNs = (field: string, namespace: any, sep = '::') => {
  if (namespace) {
    return `${namespace}${sep}${field}`;
  }

  return field;
};
