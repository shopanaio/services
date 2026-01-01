const next = () => {
  return crypto.randomUUID() as string;
};

export const ID = {
  next,
};
