type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  id?: string;
};

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
  id,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = total ? (clampedPage - 1) * pageSize + 1 : 0;
  const end = total ? Math.min(total, clampedPage * pageSize) : 0;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600"
      aria-live="polite"
      aria-atomic="true"
      id={id}
    >
      <p>
        {total ? `Showing ${start}–${end} of ${total}` : "No results to display"}
      </p>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`${id ?? "pagination"}-page-size`}>
          Rows per page
        </label>
        <select
          id={`${id ?? "pagination"}-page-size`}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs"
          value={pageSize}
          onChange={(e) => {
            const size = Number(e.target.value);
            onPageSizeChange(Number.isNaN(size) ? pageSize : size);
            onPageChange(1);
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-2 py-1 font-medium text-zinc-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, clampedPage - 1))}
            disabled={clampedPage <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span aria-live="polite">
            Page {clampedPage} / {totalPages}
          </span>
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-2 py-1 font-medium text-zinc-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.min(totalPages, clampedPage + 1))}
            disabled={clampedPage >= totalPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

