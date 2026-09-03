export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function nextSortState(currentKey, currentDir, clickedKey) {
  if (currentKey === clickedKey) {
    return { sortBy: clickedKey, sortDir: currentDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortBy: clickedKey, sortDir: 'asc' };
}

export function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const as = a instanceof Date ? a.getTime() : String(a).toLowerCase();
  const bs = b instanceof Date ? b.getTime() : String(b).toLowerCase();
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

/** Client-side sort for current page rows. getter(row) => comparable value */
export function sortRows(rows, sortBy, sortDir, getters) {
  if (!sortBy || !getters?.[sortBy]) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((ra, rb) => dir * compareValues(getters[sortBy](ra), getters[sortBy](rb)));
}
