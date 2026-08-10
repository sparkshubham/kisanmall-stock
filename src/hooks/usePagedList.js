import { useCallback, useEffect, useState } from 'react';

/**
 * Shared list pagination state + loader.
 * fetcher({ page, pageSize, q }) => Promise<{ rows, total, page, pageSize, totalPages }>
 */
export function usePagedList(fetcher, { pageSize = 25, deps = [] } = {}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetcher({ page, pageSize, q: search });
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.page && data.page !== page) setPage(data.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [fetcher, page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load, ...deps]);

  useEffect(() => {
    setPage(1);
  }, [search, ...deps]);

  function applySearch() {
    setSearch(q.trim());
  }

  return {
    rows,
    page,
    setPage,
    total,
    totalPages,
    q,
    setQ,
    search,
    applySearch,
    loading,
    error,
    setError,
    reload: load,
  };
}
