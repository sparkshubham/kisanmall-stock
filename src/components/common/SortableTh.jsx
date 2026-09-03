export default function SortableTh({ label, sortKey, sortBy, sortDir, onSort, className = '' }) {
  if (!sortKey || !onSort) {
    return <th className={className}>{label}</th>;
  }

  const active = sortBy === sortKey;
  const ariaSort = active ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none';

  return (
    <th className={`sortable-th ${active ? 'active' : ''} ${className}`.trim()} aria-sort={ariaSort}>
      <button type="button" className="sortable-th-btn" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}
