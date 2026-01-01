import { useState } from 'react';

export interface IPaginationProps {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

export const usePagination = (pagination?: {
  page?: number;
  pageSize?: number;
}) => {
  const [page, setPage] = useState(pagination?.page || 1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 25);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
  };
};
