export default function Pagination({ page, totalPages, total, onPageChange, disabled }) {
  if (!totalPages || totalPages <= 1) {
    return total != null ? (
      <div className="pagination muted">
        {total} item{total === 1 ? '' : 's'}
      </div>
    ) : null;
  }

  return (
    <div className="pagination">
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
    </div>
  );
}
