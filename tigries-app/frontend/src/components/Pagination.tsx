import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { PaginationResult } from "../lib/pagination";

type Props = Pick<
  PaginationResult<unknown>,
  "page" | "pageSize" | "totalItems" | "totalPages" | "goToPage" | "changePageSize"
>;

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  goToPage,
  changePageSize,
}: Props) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="pagination-controls">
        <div className="pagination-size-wrap">
          <select
            aria-label="Rows per page"
            className="pagination-size"
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
        <div className="pagination-pages">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => goToPage(1)}
            title="First page"
            type="button"
          >
            <ChevronsLeft aria-hidden="true" size={13} />
          </button>
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
            title="Previous page"
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={13} />
          </button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === null ? (
              <span className="pagination-ellipsis" key={`dots-${i}`}>…</span>
            ) : (
              <button
                className={p === page ? "pagination-btn active" : "pagination-btn"}
                key={p}
                onClick={() => goToPage(p)}
                type="button"
              >
                {p}
              </button>
            )
          )}

          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => goToPage(page + 1)}
            title="Next page"
            type="button"
          >
            <ChevronRight aria-hidden="true" size={13} />
          </button>
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => goToPage(totalPages)}
            title="Last page"
            type="button"
          >
            <ChevronsRight aria-hidden="true" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [1];

  if (current > 3) pages.push(null);

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push(null);

  pages.push(total);
  return pages;
}
