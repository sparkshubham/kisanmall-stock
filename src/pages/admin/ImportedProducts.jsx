import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const emptyForm = { name: '', barcode: '', mrp: '', salePrice: '', unit: 'PCS' };

export default function ImportedProducts() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/products', {
      params: { page, pageSize: 25, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load products'));
  }, [load]);

  useEffect(() => setPage(1), [search]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      barcode: p.barcode,
      mrp: String(p.mrp ?? ''),
      salePrice: String(p.salePrice ?? ''),
      unit: p.unit || 'PCS',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        barcode: form.barcode,
        mrp: Number(form.mrp) || 0,
        salePrice: Number(form.salePrice) || Number(form.mrp) || 0,
        unit: form.unit || 'PCS',
      };
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    setError('');
    try {
      await api.delete(`/products/${p.id}`);
      if (editingId === p.id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product');
    }
  }

  return (
    <div>
      <h1 className="page-title">Imported Products</h1>
      <p className="page-sub">Create, edit or remove products (including SWIL catalog)</p>
      {error && <div className="alert error">{error}</div>}
      <form className="card form-grid" onSubmit={onSubmit} style={{ marginBottom: '1.25rem' }}>
        <label>
          Product
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Barcode
          <input
            value={form.barcode}
            onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            required
          />
        </label>
        <label>
          MRP
          <input
            type="number"
            step="0.01"
            value={form.mrp}
            onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
          />
        </label>
        <label>
          Sale Price
          <input
            type="number"
            step="0.01"
            value={form.salePrice}
            onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
          />
        </label>
        <label>
          Unit
          <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        </label>
        <div className="row-actions">
          <button className="btn" type="submit" disabled={busy}>
            {editingId ? 'Update Product' : 'Add Product'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Name or barcode"
          />
        </label>
        <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
          Search
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Barcode</th>
              <th>MRP</th>
              <th>Sale</th>
              <th>Discount</th>
              <th>Purchase</th>
              <th>Sales</th>
              <th>Closing</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.barcode}</td>
                <td>₹{Number(p.mrp).toFixed(2)}</td>
                <td>₹{Number(p.salePrice || p.mrp).toFixed(2)}</td>
                <td>₹{Math.max(0, Number(p.mrp) - Number(p.salePrice || p.mrp)).toFixed(2)}</td>
                <td>{Number(p.purchaseQty || 0)}</td>
                <td>{Number(p.salesQty || 0)}</td>
                <td>{Number(p.closingQty || 0)}</td>
                <td>{p.unit}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn secondary sm" type="button" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button className="btn danger sm" type="button" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="empty">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
