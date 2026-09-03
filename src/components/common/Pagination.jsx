import { PAGE_SIZE_OPTIONS } from '../../utils/tableControls';

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  disabled,
}) {
  const showPager = totalPages > 1;

  return (
    <div className="pagination">
      {onPageSizeChange && (
        <label className="page-size">
          Rows
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}

      {showPager ? (
        <>
          <button
            className="btn secondary"
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span className="muted">
            Page {page} / {totalPages}
            {total != null ? ` · ${total} items` : ''}
          </span>
          <button
            className="btn secondary"
            type="button"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </>
      ) : (
        <span className="muted">
          {total != null ? `${total} item${total === 1 ? '' : 's'}` : null}
        </span>
      )}
    </div>
  );
}
