import { useEffect, useMemo, useState } from "react";

export type PaginationResult<T> = {
  page: number;
  pageSize: number;
  pageItems: T[];
  totalPages: number;
  totalItems: number;
  goToPage: (page: number) => void;
  changePageSize: (size: number) => void;
};

/** Slice an array into pages. Pass `resetKey` to jump back to page 1 when filters change. */
export function usePagination<T>(
  items: T[],
  defaultPageSize: 25 | 50 = 25,
  resetKey?: string
): PaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function changePageSize(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  return {
    page: safePage,
    pageSize,
    pageItems,
    totalPages,
    totalItems: items.length,
    goToPage,
    changePageSize,
  };
}
