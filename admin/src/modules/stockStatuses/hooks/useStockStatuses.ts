import { StockStatuses } from '@src/defs/constants';

export const useStockStatuses = () => {
  return {
    stockStatuses: Object.values(StockStatuses),
    defaultStockStatus: StockStatuses.IN_STOCK,
  };
};
