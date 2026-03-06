'use client';

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationControlsProps) {
  const normalizedTotal = Math.max(total, 0);
  const totalPages = Math.max(1, Math.ceil(normalizedTotal / Math.max(pageSize, 1)));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const from = normalizedTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = normalizedTotal === 0 ? 0 : Math.min(currentPage * pageSize, normalizedTotal);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        Showing {from}-{to} of {normalizedTotal}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="text-xs text-slate-500">
            Rows
            <select
              className="field-input ml-2 w-20 py-1 text-xs"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="btn-pill text-xs disabled:opacity-50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Prev
        </button>
        <span className="text-xs text-slate-600">
          {currentPage}/{totalPages}
        </span>
        <button
          type="button"
          className="btn-pill text-xs disabled:opacity-50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

